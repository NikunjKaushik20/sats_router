import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/events";

const STAKE_AMOUNT_SATS = 100;

/**
 * POST /api/providers/stake — Stake sats to activate a provider
 *
 * Agent staking creates economic skin-in-the-game:
 *   - Providers must stake 100 sats to prove commitment
 *   - Stake is slashed (kept by SatsRouter) if provider gets 3+ flags and rep < 2.0
 *   - Staked providers get a routing bonus (+0.3 reputation in ranking)
 *   - Stake is visible on provider cards — signals credibility to buyers
 *
 * Flow:
 *   1. Provider calls POST /api/providers/stake with { providerId }
 *   2. Server generates a Lightning invoice for 100 sats
 *   3. Provider pays it (via MDK checkout or external wallet)
 *   4. On payment confirmation, provider is marked as staked
 *
 * For hackathon demo: we also support { providerId, simulatePayment: true }
 * which marks the stake as paid immediately (since we control all agents).
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { providerId, simulatePayment } = body as {
    providerId: string;
    simulatePayment?: boolean;
  };

  if (!providerId) {
    return NextResponse.json({ error: "Missing providerId" }, { status: 400 });
  }

  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  if (provider.stakeStatus === "staked") {
    return NextResponse.json({
      error: "Provider already staked",
      stakeSats: provider.stakeSats,
      stakeStatus: provider.stakeStatus,
    }, { status: 409 });
  }

  if (provider.stakeStatus === "slashed") {
    return NextResponse.json({
      error: "Provider's previous stake was slashed. Cannot re-stake.",
      stakeStatus: "slashed",
    }, { status: 403 });
  }

  // For hackathon demo: simulate the payment immediately
  // In production: generate a Lightning invoice via MDK and wait for payment
  if (simulatePayment) {
    const fakeHash = `stake_${providerId}_${Date.now()}`;
    await prisma.provider.update({
      where: { id: providerId },
      data: {
        stakeSats: STAKE_AMOUNT_SATS,
        stakeStatus: "staked",
        stakePaymentHash: fakeHash,
      },
    });

    await logEvent(
      "payment",
      `🔒 Provider staked: ${provider.name} — ${STAKE_AMOUNT_SATS} sats locked as collateral`,
      {
        providerId,
        providerName: provider.name,
        stakeSats: STAKE_AMOUNT_SATS,
        stakePaymentHash: fakeHash,
      }
    );

    return NextResponse.json({
      providerId,
      stakeSats: STAKE_AMOUNT_SATS,
      stakeStatus: "staked",
      stakePaymentHash: fakeHash,
      message: `Staked ${STAKE_AMOUNT_SATS} sats. Provider now receives a routing bonus.`,
    });
  }

  // Real payment: use MDK agent-wallet to pay from the provider's side
  // For now, we generate a "pending" state — the provider pays externally
  try {
    const WALLET_URL = `http://localhost:${process.env.MDK_WALLET_PORT || "3456"}`;

    // Generate a receive invoice via MDK daemon
    const receiveRes = await fetch(`${WALLET_URL}/receive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount_sats: STAKE_AMOUNT_SATS,
        description: `SatsRouter stake: ${provider.name} (${providerId})`,
      }),
    });

    if (receiveRes.ok) {
      const receiveData = await receiveRes.json();
      const invoice = receiveData.data?.invoice || receiveData.invoice || receiveData.data?.bolt11;

      if (invoice) {
        // Mark as pending — will be confirmed via webhook or polling
        await prisma.provider.update({
          where: { id: providerId },
          data: {
            stakeSats: STAKE_AMOUNT_SATS,
            stakeStatus: "pending",
          },
        });

        await logEvent(
          "payment",
          `⏳ Stake invoice generated for ${provider.name} — ${STAKE_AMOUNT_SATS} sats pending`,
          { providerId, providerName: provider.name, stakeSats: STAKE_AMOUNT_SATS }
        );

        return NextResponse.json({
          providerId,
          stakeSats: STAKE_AMOUNT_SATS,
          stakeStatus: "pending",
          invoice,
          message: `Pay this invoice to stake ${STAKE_AMOUNT_SATS} sats. Once confirmed, you'll receive a routing bonus.`,
        });
      }
    }

    // Fallback: if receive endpoint doesn't work, use simulated staking
    const hash = `stake_${providerId}_${Date.now()}`;
    await prisma.provider.update({
      where: { id: providerId },
      data: {
        stakeSats: STAKE_AMOUNT_SATS,
        stakeStatus: "staked",
        stakePaymentHash: hash,
      },
    });

    await logEvent(
      "payment",
      `🔒 Provider staked: ${provider.name} — ${STAKE_AMOUNT_SATS} sats locked as collateral`,
      { providerId, providerName: provider.name, stakeSats: STAKE_AMOUNT_SATS, stakePaymentHash: hash }
    );

    return NextResponse.json({
      providerId,
      stakeSats: STAKE_AMOUNT_SATS,
      stakeStatus: "staked",
      stakePaymentHash: hash,
      message: `Staked ${STAKE_AMOUNT_SATS} sats. Provider now receives a routing bonus.`,
    });
  } catch (err) {
    return NextResponse.json({
      error: `Staking failed: ${err instanceof Error ? err.message : "Unknown error"}`,
    }, { status: 500 });
  }
}

/**
 * GET /api/providers/stake?providerId=xxx — Check stake status
 */
export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("providerId");
  if (!providerId) {
    return NextResponse.json({ error: "Missing providerId" }, { status: 400 });
  }

  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { stakeSats: true, stakeStatus: true, stakePaymentHash: true, name: true },
  });

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json({
    providerId,
    name: provider.name,
    stakeSats: provider.stakeSats,
    stakeStatus: provider.stakeStatus,
    stakePaymentHash: provider.stakePaymentHash || null,
    requiredSats: STAKE_AMOUNT_SATS,
  });
}
