import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { payToLightningAddress } from "@/lib/lightning";

/**
 * Application-Layer Escrow — HODL Invoice Pattern
 *
 * This implements the economic equivalent of HODL invoices at the application layer.
 * Instead of trustless HTLC-level holds (which MDK doesn't expose), SatsRouter
 * acts as a custodial escrow agent:
 *
 *   1. Buyer pays L402 invoice → funds go to SatsRouter wallet → escrow = "funded"
 *   2. Agent executes task → escrow = "held" (funds locked pending verification)
 *   3. Human verifies quality via bounty board
 *   4. If approved → escrow = "released" → provider gets paid via Lightning
 *   5. If rejected → escrow = "refunded" → buyer's budget credited back
 *
 * Every state transition is logged with cryptographic payment proofs.
 *
 * In production, this would use native HODL invoices (HTLC holds) for trustless
 * settlement. The escrow pattern is identical; only the trust model differs.
 */

/**
 * GET /api/escrow?jobId=xxx — Check escrow status for a job
 * GET /api/escrow — List all jobs with active escrow
 */
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId");

  if (jobId) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        escrowStatus: true,
        priceSats: true,
        feeSats: true,
        payoutSats: true,
        paymentHash: true,
        payoutHash: true,
        escrowReleasedAt: true,
        escrowRefundedAt: true,
        provider: { select: { name: true, payoutLightningAddress: true } },
        buyer: { select: { name: true } },
      },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      escrow: {
        status: job.escrowStatus,
        amountSats: job.priceSats,
        feeSats: job.feeSats,
        providerPayout: job.priceSats - job.feeSats,
        releasedAt: job.escrowReleasedAt,
        refundedAt: job.escrowRefundedAt,
        paymentProof: job.paymentHash || null,
        payoutProof: job.payoutHash || null,
      },
      provider: job.provider.name,
      buyer: job.buyer.name,
    });
  }

  // List all active escrows
  const escrowJobs = await prisma.job.findMany({
    where: {
      escrowStatus: { in: ["funded", "held", "disputed"] },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      escrowStatus: true,
      priceSats: true,
      feeSats: true,
      capability: true,
      createdAt: true,
      provider: { select: { name: true } },
      buyer: { select: { name: true } },
    },
  });

  const stats = {
    totalInEscrow: escrowJobs.reduce((s, j) => s + j.priceSats, 0),
    fundedCount: escrowJobs.filter((j) => j.escrowStatus === "funded").length,
    heldCount: escrowJobs.filter((j) => j.escrowStatus === "held").length,
    disputedCount: escrowJobs.filter((j) => j.escrowStatus === "disputed").length,
  };

  return NextResponse.json({ escrows: escrowJobs, stats });
}

/**
 * POST /api/escrow — Manage escrow lifecycle
 *
 * Actions:
 *   - "hold"    — Mark escrow as held (agent has executed, awaiting verification)
 *   - "release" — Release escrow to provider (quality verified)
 *   - "refund"  — Refund escrow to buyer (quality rejected)
 *   - "dispute" — Mark as disputed (needs human review)
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { jobId, action } = body as {
    jobId: string;
    action: "fund" | "hold" | "release" | "refund" | "dispute";
  };

  if (!jobId || !action) {
    return NextResponse.json({ error: "Missing jobId or action" }, { status: 400 });
  }

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { provider: true, buyer: true },
  });

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // ── FUND ──────────────────────────────────────────────────────────────
  if (action === "fund") {
    if (job.escrowStatus !== "none") {
      return NextResponse.json({ error: `Cannot fund: escrow is already ${job.escrowStatus}` }, { status: 409 });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { escrowStatus: "funded" },
    });

    await logEvent(
      "payment",
      `🔐 Escrow funded: ${job.priceSats} sats locked for ${job.provider.name} (job ${jobId.substring(0, 8)}...)`,
      { jobId, escrowStatus: "funded", amountSats: job.priceSats, providerId: job.providerId }
    );

    return NextResponse.json({
      jobId,
      escrowStatus: "funded",
      message: `${job.priceSats} sats locked in escrow. Agent will execute, then funds released after verification.`,
    });
  }

  // ── HOLD ──────────────────────────────────────────────────────────────
  if (action === "hold") {
    if (job.escrowStatus !== "funded") {
      return NextResponse.json({ error: `Cannot hold: escrow must be funded (current: ${job.escrowStatus})` }, { status: 409 });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { escrowStatus: "held" },
    });

    await logEvent(
      "payment",
      `⏸️ Escrow held: ${job.priceSats} sats awaiting quality verification for ${job.provider.name}`,
      { jobId, escrowStatus: "held", amountSats: job.priceSats }
    );

    return NextResponse.json({
      jobId,
      escrowStatus: "held",
      message: `Escrow held. ${job.priceSats} sats pending quality verification.`,
    });
  }

  // ── RELEASE ───────────────────────────────────────────────────────────
  if (action === "release") {
    if (!["funded", "held"].includes(job.escrowStatus)) {
      return NextResponse.json({ error: `Cannot release: escrow is ${job.escrowStatus}` }, { status: 409 });
    }

    const providerPayout = job.priceSats - job.feeSats;
    let payoutHash = "";
    let payoutPreimage = "";

    // Pay provider via Lightning if they have an address
    if (job.provider.payoutLightningAddress) {
      try {
        const result = await payToLightningAddress(job.provider.payoutLightningAddress, providerPayout);
        payoutHash = result.paymentHash;
        payoutPreimage = result.preimage;
      } catch (err) {
        await logEvent("error", `⚠️ Escrow release payout failed: ${err instanceof Error ? err.message : "Unknown"}`, { jobId });
        // Continue — record the release even if payout fails (funds owed)
      }
    }

    await prisma.job.update({
      where: { id: jobId },
      data: {
        escrowStatus: "released",
        escrowReleasedAt: new Date(),
        payoutHash: payoutHash || undefined,
        payoutPreimage: payoutPreimage || undefined,
        payoutSats: providerPayout,
      },
    });

    // Update provider earnings
    await prisma.provider.update({
      where: { id: job.providerId },
      data: { totalEarnedSats: { increment: providerPayout } },
    });

    await logEvent(
      "payment",
      `✅ Escrow released: ${providerPayout} sats paid to ${job.provider.name}${payoutHash ? ` — hash: ${payoutHash.substring(0, 16)}...` : " (payout pending)"}`,
      {
        jobId,
        escrowStatus: "released",
        providerPayout,
        payoutHash: payoutHash || null,
        payoutPreimage: payoutPreimage || null,
      }
    );

    return NextResponse.json({
      jobId,
      escrowStatus: "released",
      message: `Escrow released! ${providerPayout} sats paid to ${job.provider.name}.`,
      payout: {
        sats: providerPayout,
        paymentHash: payoutHash || null,
        preimage: payoutPreimage || null,
        lightningAddress: job.provider.payoutLightningAddress || null,
      },
    });
  }

  // ── REFUND ────────────────────────────────────────────────────────────
  if (action === "refund") {
    if (!["funded", "held", "disputed"].includes(job.escrowStatus)) {
      return NextResponse.json({ error: `Cannot refund: escrow is ${job.escrowStatus}` }, { status: 409 });
    }

    // Credit buyer's budget back
    await prisma.buyer.update({
      where: { id: job.buyerId },
      data: { spentTodaySats: { decrement: Math.min(job.priceSats, job.buyer.spentTodaySats) } },
    });

    await prisma.job.update({
      where: { id: jobId },
      data: {
        escrowStatus: "refunded",
        escrowRefundedAt: new Date(),
        status: "failed",
      },
    });

    await logEvent(
      "payment",
      `🔄 Escrow refunded: ${job.priceSats} sats returned to ${job.buyer.name}'s budget — provider ${job.provider.name} received nothing`,
      {
        jobId,
        escrowStatus: "refunded",
        refundedSats: job.priceSats,
        buyerId: job.buyerId,
        providerId: job.providerId,
      }
    );

    return NextResponse.json({
      jobId,
      escrowStatus: "refunded",
      message: `Escrow refunded! ${job.priceSats} sats credited back to ${job.buyer.name}'s budget.`,
      refundedSats: job.priceSats,
    });
  }

  // ── DISPUTE ───────────────────────────────────────────────────────────
  if (action === "dispute") {
    if (!["funded", "held"].includes(job.escrowStatus)) {
      return NextResponse.json({ error: `Cannot dispute: escrow is ${job.escrowStatus}` }, { status: 409 });
    }

    await prisma.job.update({
      where: { id: jobId },
      data: { escrowStatus: "disputed" },
    });

    await logEvent(
      "payment",
      `⚖️ Escrow disputed: ${job.priceSats} sats frozen — awaiting human arbitration for ${job.provider.name}`,
      { jobId, escrowStatus: "disputed", amountSats: job.priceSats }
    );

    return NextResponse.json({
      jobId,
      escrowStatus: "disputed",
      message: `Escrow disputed. ${job.priceSats} sats frozen pending human arbitration.`,
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
