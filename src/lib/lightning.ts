/**
 * Lightning payment wrapper using the MDK agent-wallet daemon.
 *
 * Previous approach: MoneyDevKitNode embedded in the Next.js process.
 * Problem: MDK's Next.js plugin (withMdkCheckout) already runs an LDK node
 * internally for the L402 server. Starting a second node with the same
 * mnemonic causes a native "Node is already running" panic.
 *
 * Current approach: Delegate all payment operations to the MDK agent-wallet
 * daemon running on localhost:3456. This is the recommended pattern from
 * https://docs.moneydevkit.com/agent-wallet
 *
 * The daemon is started with: npx @moneydevkit/agent-wallet@latest start
 * It manages its own LDK node lifecycle, avoids conflicts, and provides
 * a simple HTTP API for balance, send, and receive operations.
 */

import { deriveNodeId } from "@moneydevkit/core";

const WALLET_DAEMON_URL = `http://localhost:${process.env.MDK_WALLET_PORT || "3456"}`;

/**
 * Pay a Lightning invoice (bolt11 string) via the agent-wallet daemon.
 * Returns paymentHash and preimage on success — cryptographic proof money moved.
 */
export async function payInvoice(bolt11: string): Promise<{
  paymentHash: string;
  preimage: string;
}> {
  // Step 1: Submit the payment
  const res = await fetch(`${WALLET_DAEMON_URL}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination: bolt11 }),
  });

  const json = await res.json();

  if (!json.success) {
    const errMsg = json.error?.message || json.error || "Unknown payment error";
    throw new Error(`Wallet daemon payment failed: ${errMsg}`);
  }

  const d = json.data || json;
  const paymentHash = d.payment_hash ?? d.paymentHash ?? d.paymentId ?? "";

  // If the daemon already returned a preimage (completed immediately), use it
  if (d.preimage) {
    return { paymentHash, preimage: d.preimage };
  }

  // Step 2: Poll /payments for the preimage (daemon returns pending immediately)
  const maxWait = 30_000; // 30 seconds max
  const pollInterval = 1_000; // 1 second
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, pollInterval));

    try {
      const paymentsRes = await fetch(`${WALLET_DAEMON_URL}/payments`);
      const paymentsJson = await paymentsRes.json();

      if (paymentsJson.success && Array.isArray(paymentsJson.data?.payments)) {
        const match = paymentsJson.data.payments.find(
          (p: Record<string, unknown>) =>
            (p.paymentHash === paymentHash || p.paymentId === paymentHash) &&
            p.status === "completed"
        );
        if (match?.preimage) {
          return { paymentHash, preimage: match.preimage as string };
        }
      }
    } catch {
      // Polling error — retry
    }
  }

  throw new Error(`Payment submitted but preimage not received within ${maxWait / 1000}s for hash ${paymentHash}`);
}

/**
 * Get the Lightning node ID (public key) for Riya's wallet.
 * Fast derivation — does NOT start the full node.
 */
export function getNodeId(): string {
  const mnemonic = process.env.MDK_MNEMONIC;
  if (!mnemonic) throw new Error("MDK_MNEMONIC must be set in .env");
  return deriveNodeId(mnemonic, "bitcoin");
}

/**
 * Get current Lightning wallet balance in sats via the agent-wallet daemon.
 */
export async function getBalance(): Promise<number> {
  const res = await fetch(`${WALLET_DAEMON_URL}/balance`, {
    method: "GET",
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error(`Wallet daemon balance check failed: ${json.error?.message || "unknown"}`);
  }

  const d = json.data || json;
  return d.balance_sats ?? d.balanceSats ?? 0;
}

/**
 * L402 payment result — includes both the agent response and proof of payment.
 */
export interface L402Result {
  response: Response;
  /** SHA256 of the payment preimage — recorded on Lightning network. Empty string if not yet proved. */
  paymentHash: string;
  /** Cryptographic proof that the invoice was paid — SHA256(preimage) == paymentHash. */
  preimage: string;
}

/**
 * L402 client: Call an L402-protected endpoint, pay if needed, retry.
 *
 * Flow:
 *   1. POST to endpoint → if 200, return result (free or already paid)
 *   2. If 402, parse invoice + macaroon from response body
 *   3. Pay the invoice via the MDK agent-wallet daemon
 *   4. Retry POST with Authorization: L402 <macaroon>:<preimage>
 *
 * Returns the agent Response AND the payment proof (hash + preimage).
 *
 * @param url   - The endpoint URL (must accept POST)
 * @param body  - JSON body to send
 */
export async function callL402Endpoint(
  url: string,
  body: Record<string, unknown>
): Promise<L402Result> {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };

  // Step 1: Initial request — expect 402 if paywalled
  const challenge = await fetch(url, init);

  // MDK wraps 402 as 200 with error.code = "payment_required"
  if (challenge.status !== 402) {
    // Check if MDK wrapped the 402 in a 200 response
    try {
      const cloned = challenge.clone();
      const data = await cloned.json();
      if (data?.error?.code === "payment_required" && data?.macaroon && data?.invoice) {
        // This IS a 402 challenge, just wrapped in 200
        return await handleL402Challenge(url, init, data);
      }
    } catch {
      // Not JSON or not a wrapped 402 — that's fine
    }
    // Genuinely free endpoint — return directly with empty proof
    return { response: challenge, paymentHash: "", preimage: "" };
  }

  // Standard 402 response
  let challengeData: Record<string, unknown>;
  try {
    challengeData = await challenge.json();
  } catch {
    throw new Error(`402 response had non-JSON body from ${url}`);
  }

  return handleL402Challenge(url, init, challengeData);
}

/**
 * Resolve a Lightning Address (e.g. `agent@walletofsatoshi.com`) to a bolt11 invoice
 * for the requested amount, using LNURL-pay (LUD-16).
 *
 * Flow:
 *   1. GET https://<domain>/.well-known/lnurlp/<user>      → { callback, minSendable, maxSendable }
 *   2. GET <callback>?amount=<msats>                       → { pr: "lnbc..." }
 *
 * Throws on any failure (DNS, HTTP, amount out of range, malformed response).
 */
export async function lnurlFetchInvoice(
  lightningAddress: string,
  amountSats: number
): Promise<string> {
  const trimmed = lightningAddress.trim();
  if (!trimmed.includes("@")) {
    throw new Error(`Invalid Lightning Address (no @): ${trimmed}`);
  }
  const [user, domain] = trimmed.split("@");
  if (!user || !domain) {
    throw new Error(`Invalid Lightning Address: ${trimmed}`);
  }

  const lnurlpUrl = `https://${domain}/.well-known/lnurlp/${user}`;
  const params = await fetch(lnurlpUrl, { headers: { Accept: "application/json" } });
  if (!params.ok) {
    throw new Error(`LNURL-pay lookup failed for ${trimmed}: ${params.status}`);
  }
  const meta = (await params.json()) as {
    callback?: string;
    minSendable?: number;
    maxSendable?: number;
    tag?: string;
    status?: string;
    reason?: string;
  };
  if (meta.status === "ERROR") {
    throw new Error(`LNURL-pay error for ${trimmed}: ${meta.reason || "unknown"}`);
  }
  if (!meta.callback) {
    throw new Error(`LNURL-pay response missing callback for ${trimmed}`);
  }

  const amountMsats = amountSats * 1000;
  if (meta.minSendable && amountMsats < meta.minSendable) {
    throw new Error(
      `Amount ${amountSats} sats below ${trimmed} min ${meta.minSendable / 1000} sats`
    );
  }
  if (meta.maxSendable && amountMsats > meta.maxSendable) {
    throw new Error(
      `Amount ${amountSats} sats above ${trimmed} max ${meta.maxSendable / 1000} sats`
    );
  }

  const sep = meta.callback.includes("?") ? "&" : "?";
  const invoiceUrl = `${meta.callback}${sep}amount=${amountMsats}`;
  const inv = await fetch(invoiceUrl, { headers: { Accept: "application/json" } });
  if (!inv.ok) {
    throw new Error(`LNURL-pay callback failed for ${trimmed}: ${inv.status}`);
  }
  const invJson = (await inv.json()) as {
    pr?: string;
    status?: string;
    reason?: string;
  };
  if (invJson.status === "ERROR" || !invJson.pr) {
    throw new Error(
      `LNURL-pay invoice fetch failed for ${trimmed}: ${invJson.reason || "no pr field"}`
    );
  }
  return invJson.pr;
}

/**
 * Pay a Lightning Address directly: fetch invoice via LNURL-pay then pay it via the wallet daemon.
 * Returns cryptographic payment proof (hash + preimage).
 *
 * This is how SatsRouter pays providers their share of each transaction.
 */
export async function payToLightningAddress(
  lightningAddress: string,
  amountSats: number
): Promise<{ paymentHash: string; preimage: string; bolt11: string }> {
  const bolt11 = await lnurlFetchInvoice(lightningAddress, amountSats);
  const proof = await payInvoice(bolt11);
  return { ...proof, bolt11 };
}

/**
 * Handle the L402 challenge: pay the invoice and retry with proof.
 */
async function handleL402Challenge(
  url: string,
  init: RequestInit,
  challengeData: Record<string, unknown>
): Promise<L402Result> {
  const macaroon = challengeData.macaroon as string | undefined;
  const bolt11 = (challengeData.invoice || challengeData.paymentRequest) as string | undefined;

  if (!macaroon || !bolt11) {
    throw new Error(
      `402 response missing macaroon or invoice from ${url}: ${JSON.stringify(challengeData)}`
    );
  }

  // Step 3: Pay the Lightning invoice — this is where real sats move
  const payment = await payInvoice(bolt11);

  // Step 4: Retry with L402 credential (macaroon:preimage)
  const retryResponse = await fetch(url, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      Authorization: `L402 ${macaroon}:${payment.preimage}`,
    },
  });

  return {
    response: retryResponse,
    paymentHash: payment.paymentHash,
    preimage: payment.preimage,
  };
}
