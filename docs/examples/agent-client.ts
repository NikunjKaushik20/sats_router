/**
 * External Agent Client — Proves any agent with a Lightning wallet can buy SatsRouter services.
 *
 * This script demonstrates the L402 protocol flow:
 *   1. POST to /api/agents/quick-scan → receive HTTP 402 + Lightning invoice
 *   2. Pay the invoice via MDK agent-wallet daemon
 *   3. Retry with L402 Authorization header (macaroon:preimage)
 *   4. Receive structured AI result
 *
 * Usage:
 *   1. Start the MDK wallet daemon:  npx @moneydevkit/agent-wallet@latest start
 *   2. Start SatsRouter:            npm run dev
 *   3. Run this client:             npx tsx examples/agent-client.ts
 *
 * This client could be ANY external agent — a Claude instance, a GPT-4 agent,
 * or a custom bot. No API keys, no accounts — just HTTP + Lightning.
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const WALLET_URL = `http://localhost:${process.env.MDK_WALLET_PORT || "3456"}`;

// ── Demo log data (what a real agent would send) ────────────────────────────

const SAMPLE_LOGS = [
  "2024-01-15 12:01:00 INFO  Request received: GET /api/users",
  "2024-01-15 12:02:55 ERROR DB connection pool exhausted (max: 50)",
  "2024-01-15 12:03:00 ERROR 500 Internal Server Error — connection timeout",
  "2024-01-15 12:03:05 WARN  Circuit breaker OPEN for service: user-db",
  "2024-01-15 12:03:10 ERROR Health check failed: /health returned 503",
];

// ── Utilities ───────────────────────────────────────────────────────────────

function log(emoji: string, msg: string, data?: unknown) {
  const ts = new Date().toISOString().substring(11, 19);
  console.log(`  [${ts}] ${emoji} ${msg}`);
  if (data) console.log(`           ${JSON.stringify(data, null, 2).split("\n").join("\n           ")}`);
}

async function getBalance(): Promise<number> {
  const res = await fetch(`${WALLET_URL}/balance`);
  const json = await res.json();
  return json.data?.balance_sats ?? json.balance_sats ?? 0;
}

async function payInvoice(bolt11: string): Promise<{ paymentHash: string; preimage: string }> {
  const res = await fetch(`${WALLET_URL}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ destination: bolt11 }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(`Payment failed: ${json.error?.message || json.error}`);
  const d = json.data || json;

  // Poll for preimage if not returned immediately
  const paymentHash = d.payment_hash ?? d.paymentHash ?? "";
  if (d.preimage) return { paymentHash, preimage: d.preimage };

  const start = Date.now();
  while (Date.now() - start < 15_000) {
    await new Promise((r) => setTimeout(r, 1000));
    const pr = await fetch(`${WALLET_URL}/payments`);
    const pj = await pr.json();
    if (pj.success && Array.isArray(pj.data?.payments)) {
      const match = pj.data.payments.find(
        (p: Record<string, unknown>) =>
          (p.paymentHash === paymentHash || p.paymentId === paymentHash) && p.status === "completed"
      );
      if (match?.preimage) return { paymentHash, preimage: match.preimage as string };
    }
  }
  throw new Error("Payment sent but preimage not received within 15s");
}

// ── Main Flow ───────────────────────────────────────────────────────────────

async function main() {
  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│   ⚡ SatsRouter External Agent Client                       │");
  console.log("│   Demonstrating L402: HTTP 402 → Pay Invoice → Get Result   │");
  console.log("└─────────────────────────────────────────────────────────────┘\n");

  // Step 0: Check wallet balance
  const balanceBefore = await getBalance();
  log("💰", `Wallet balance: ${balanceBefore} sats`);

  // Step 1: Call Quick Scanner WITHOUT payment — expect 402
  log("📡", `POST ${BASE_URL}/api/agents/quick-scan (no auth)`);

  const challenge = await fetch(`${BASE_URL}/api/agents/quick-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ logs: SAMPLE_LOGS }),
  });

  // MDK may return 402 directly or wrap it in a 200 with error.code = "payment_required"
  let macaroon: string;
  let invoice: string;

  if (challenge.status === 402) {
    log("🔒", `Received HTTP 402 — Payment Required`);
    const data = await challenge.json();
    macaroon = data.macaroon;
    invoice = data.invoice || data.paymentRequest;
  } else {
    const data = await challenge.json();
    if (data?.error?.code === "payment_required" && data.macaroon && data.invoice) {
      log("🔒", `Received wrapped 402 — Payment Required (MDK format)`);
      macaroon = data.macaroon;
      invoice = data.invoice;
    } else {
      // Endpoint is not paywalled or returned a result directly
      log("✅", `Endpoint returned 200 directly (no paywall):`, data);
      return;
    }
  }

  log("📜", `Invoice: ${invoice.substring(0, 40)}...`);
  log("🍪", `Macaroon: ${macaroon.substring(0, 30)}...`);

  // Step 2: Pay the Lightning invoice
  log("⚡", "Paying Lightning invoice via agent-wallet daemon...");

  const payment = await payInvoice(invoice);

  log("✅", `Payment confirmed!`, {
    paymentHash: payment.paymentHash,
    preimage: payment.preimage.substring(0, 20) + "...",
  });

  // Step 3: Retry with L402 credential
  log("🔑", `Retrying with Authorization: L402 <macaroon>:<preimage>`);

  const result = await fetch(`${BASE_URL}/api/agents/quick-scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `L402 ${macaroon}:${payment.preimage}`,
    },
    body: JSON.stringify({ logs: SAMPLE_LOGS }),
  });

  const agentResult = await result.json();

  log("🎯", `Agent result received!`, agentResult);

  // Step 4: Check balance after
  const balanceAfter = await getBalance();
  log("💰", `Wallet balance after: ${balanceAfter} sats (spent ${balanceBefore - balanceAfter} sats)`);

  // Summary
  console.log("\n┌─────────────────────────────────────────────────────────────┐");
  console.log("│   ✅ Complete L402 Flow Executed Successfully                │");
  console.log("│                                                              │");
  console.log(`│   Sats spent:   ${(balanceBefore - balanceAfter).toString().padEnd(10)} (Quick Scanner: 5 sats)     │`);
  console.log(`│   Payment hash: ${payment.paymentHash.substring(0, 16)}...                      │`);
  console.log(`│   Preimage:     ${payment.preimage.substring(0, 16)}...                      │`);
  console.log("│                                                              │");
  console.log("│   This proves ANY agent with a Lightning wallet can buy       │");
  console.log("│   services from SatsRouter — no API keys, no sign-up.        │");
  console.log("└─────────────────────────────────────────────────────────────┘\n");
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  console.error("\nTroubleshooting:");
  console.error("  1. Is SatsRouter running?  npm run dev");
  console.error("  2. Is the wallet daemon running?  npx @moneydevkit/agent-wallet@latest start");
  console.error("  3. Is the wallet funded?  npx @moneydevkit/agent-wallet@latest balance");
  process.exit(1);
});
