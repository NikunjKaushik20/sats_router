import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logEvent } from "@/lib/events";
import { payInvoice, payToLightningAddress } from "@/lib/lightning";

/**
 * GET /api/bounties — List bounties (public, no auth)
 * Query params:
 *   ?status=open (default) | claimed | submitted | completed | all
 */
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status") || "open";

  const where = status === "all" ? {} : { status };

  const bounties = await prisma.bounty.findMany({
    where,
    orderBy: [{ status: "asc" }, { rewardSats: "desc" }, { createdAt: "desc" }],
    take: 50,
  });

  // Compute aggregate stats
  const stats = await prisma.bounty.groupBy({
    by: ["status"],
    _count: true,
    _sum: { rewardSats: true },
  });

  const totalPaid = stats.find((s) => s.status === "completed")?._sum.rewardSats || 0;
  const totalOpen = stats.find((s) => s.status === "open")?._count || 0;
  const totalCompleted = stats.find((s) => s.status === "completed")?._count || 0;

  return NextResponse.json({
    bounties: bounties.map((b) => ({
      id: b.id,
      type: b.type,
      title: b.title,
      description: b.description,
      context: JSON.parse(b.context),
      rewardSats: b.rewardSats,
      status: b.status,
      claimedBy: b.claimedBy,
      claimedAt: b.claimedAt,
      createdAt: b.createdAt,
      expiresAt: b.expiresAt,
      completedAt: b.completedAt,
      paymentHash: b.paymentHash,
    })),
    stats: {
      totalOpen,
      totalCompleted,
      totalSatsPaid: totalPaid,
    },
  });
}

/**
 * POST /api/bounties — Create a new bounty
 * Called by the orchestrator when it needs human input.
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, title, description, context, rewardSats, jobId, expiresInMinutes } = body as {
    type: string;
    title: string;
    description: string;
    context?: Record<string, unknown>;
    rewardSats: number;
    jobId?: string;
    expiresInMinutes?: number;
  };

  if (!type || !title || !description || !rewardSats) {
    return NextResponse.json(
      { error: "Missing fields: type, title, description, rewardSats" },
      { status: 400 }
    );
  }

  const expiresAt = expiresInMinutes
    ? new Date(Date.now() + expiresInMinutes * 60_000)
    : new Date(Date.now() + 30 * 60_000); // default: 30 min

  const bounty = await prisma.bounty.create({
    data: {
      type,
      title,
      description,
      context: JSON.stringify(context || {}),
      rewardSats,
      jobId: jobId || null,
      status: "open",
      expiresAt,
    },
  });

  await logEvent("bounty", `🏷️ New bounty posted: "${title}" — ${rewardSats} sats reward`, {
    bountyId: bounty.id,
    type,
    rewardSats,
  });

  return NextResponse.json(bounty, { status: 201 });
}

/**
 * PATCH /api/bounties — Claim, submit, or complete a bounty
 *
 * Actions:
 *   claim  — Human claims an open bounty (locks it to them)
 *   submit — Human submits their work (answer, rating, etc.)
 *   pay    — System verifies and pays the human via Lightning
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { bountyId, action, claimedBy, submission, lightningAddress, bolt11Invoice, flagProvider } = body as {
    bountyId: string;
    action: "claim" | "submit" | "pay";
    claimedBy?: string;      // display name or LN address
    submission?: string;      // the human's answer
    lightningAddress?: string; // user@walletofsatoshi.com
    bolt11Invoice?: string;   // lnbc...
    flagProvider?: boolean;   // 🚩 flag the provider for bad work
  };

  if (!bountyId || !action) {
    return NextResponse.json({ error: "Missing bountyId or action" }, { status: 400 });
  }

  const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });
  if (!bounty) {
    return NextResponse.json({ error: "Bounty not found" }, { status: 404 });
  }

  // ── CLAIM ─────────────────────────────────────────────────────────────
  if (action === "claim") {
    if (bounty.status !== "open") {
      return NextResponse.json({ error: "Bounty is not open" }, { status: 409 });
    }

    // Check expiry
    if (bounty.expiresAt && new Date() > bounty.expiresAt) {
      await prisma.bounty.update({ where: { id: bountyId }, data: { status: "expired" } });
      return NextResponse.json({ error: "Bounty has expired" }, { status: 410 });
    }

    const updated = await prisma.bounty.update({
      where: { id: bountyId },
      data: {
        status: "claimed",
        claimedBy: claimedBy || "anonymous",
        claimedAt: new Date(),
      },
    });

    await logEvent("bounty", `🙋 Bounty claimed by ${claimedBy || "anonymous"}: "${bounty.title}"`, {
      bountyId,
      claimedBy: claimedBy || "anonymous",
      rewardSats: bounty.rewardSats,
    });

    return NextResponse.json({
      id: updated.id,
      status: updated.status,
      message: `Bounty claimed! Complete the task to earn ${bounty.rewardSats} sats.`,
    });
  }

  // ── SUBMIT ────────────────────────────────────────────────────────────
  if (action === "submit") {
    if (bounty.status !== "claimed") {
      return NextResponse.json(
        { error: "Bounty must be claimed before submission" },
        { status: 409 }
      );
    }
    if (!submission) {
      return NextResponse.json({ error: "Missing submission" }, { status: 400 });
    }

    // Handle provider flag/ban (human-in-the-loop trust mechanism)
    if (flagProvider && bounty.jobId) {
      const job = await prisma.job.findUnique({ where: { id: bounty.jobId } });
      if (job) {
        const provider = await prisma.provider.findUnique({ where: { id: job.providerId } });
        if (provider) {
          const newReputation = Math.max(1.0, provider.reputationScore - 1.0);
          const newFlagCount = provider.flagCount + 1;
          const shouldSuspend = newReputation < 2.0 && newFlagCount >= 3;

          await prisma.provider.update({
            where: { id: provider.id },
            data: {
              reputationScore: Math.round(newReputation * 100) / 100,
              flagCount: newFlagCount,
              isActive: shouldSuspend ? false : provider.isActive,
              // Slash stake if suspended and provider was staked
              ...(shouldSuspend && provider.stakeStatus === "staked" ? { stakeStatus: "slashed" } : {}),
            },
          });

          if (shouldSuspend) {
            const wasStaked = provider.stakeStatus === "staked";
            await logEvent(
              "route",
              `🚫 Provider suspended: ${provider.name} — ${newFlagCount} flags, reputation ${newReputation.toFixed(1)}${wasStaked ? ` — ⚡ ${provider.stakeSats} sats SLASHED` : ""}`,
              {
                providerId: provider.id,
                providerName: provider.name,
                flagCount: newFlagCount,
                reputationScore: newReputation,
                reason: "Human flags triggered automatic suspension",
                stakeSlashed: wasStaked,
                slashedSats: wasStaked ? provider.stakeSats : 0,
              }
            );
          } else {
            await logEvent(
              "bounty",
              `🚩 Provider flagged: ${provider.name} — reputation dropped to ${newReputation.toFixed(1)} (${newFlagCount} flags)`,
              {
                providerId: provider.id,
                providerName: provider.name,
                flagCount: newFlagCount,
                reputationScore: newReputation,
              }
            );
          }
        }
      }
    }

    const updated = await prisma.bounty.update({
      where: { id: bountyId },
      data: {
        status: "submitted",
        submission,
      },
    });

    await logEvent("bounty", `📝 Bounty submitted by ${bounty.claimedBy}: "${bounty.title}"`, {
      bountyId,
      claimedBy: bounty.claimedBy,
      flagged: flagProvider || false,
    });

    // ── Escrow Integration ──────────────────────────────────────────────
    // If this bounty is linked to a job, manage the escrow:
    //   - Flag = refund escrow (buyer gets money back, provider gets nothing)
    //   - No flag = release escrow (provider gets paid)
    if (bounty.jobId) {
      const linkedJob = await prisma.job.findUnique({ where: { id: bounty.jobId } });
      if (linkedJob && ["funded", "held"].includes(linkedJob.escrowStatus)) {
        if (flagProvider) {
          // REFUND: quality rejected → buyer's budget credited back
          await prisma.buyer.update({
            where: { id: linkedJob.buyerId },
            data: { spentTodaySats: { decrement: Math.min(linkedJob.priceSats, 999) } },
          });
          await prisma.job.update({
            where: { id: linkedJob.id },
            data: { escrowStatus: "refunded", escrowRefundedAt: new Date() },
          });
          await logEvent("payment", `🔄 Escrow refunded: ${linkedJob.priceSats} sats returned to buyer — flagged by ${bounty.claimedBy}`, {
            jobId: linkedJob.id,
            escrowStatus: "refunded",
            refundedSats: linkedJob.priceSats,
          });
        } else {
          // RELEASE: quality approved → escrow released to provider
          await prisma.job.update({
            where: { id: linkedJob.id },
            data: { escrowStatus: "released", escrowReleasedAt: new Date() },
          });
          await logEvent("payment", `✅ Escrow released: ${linkedJob.priceSats - linkedJob.feeSats} sats confirmed for provider — verified by ${bounty.claimedBy}`, {
            jobId: linkedJob.id,
            escrowStatus: "released",
            providerPayout: linkedJob.priceSats - linkedJob.feeSats,
          });
        }
      }
    }

    // Auto-approve and pay immediately (for hackathon demo — in prod you'd verify first)
    let paymentResult: { paymentHash: string; preimage: string } | null = null;
    let paymentError: string | null = null;

    if (bolt11Invoice) {
      // Pay with provided bolt11 invoice
      try {
        paymentResult = await payInvoice(bolt11Invoice);
      } catch (err) {
        paymentError = err instanceof Error ? err.message : "Payment failed";
      }
    } else if (lightningAddress) {
      // Pay via LNURL-pay to Lightning address
      try {
        const result = await payToLightningAddress(lightningAddress, bounty.rewardSats);
        paymentResult = { paymentHash: result.paymentHash, preimage: result.preimage };
      } catch (err) {
        paymentError = err instanceof Error ? err.message : "Payment failed";
      }
    }

    if (paymentResult) {
      await prisma.bounty.update({
        where: { id: bountyId },
        data: {
          status: "completed",
          completedAt: new Date(),
          paymentHash: paymentResult.paymentHash,
          paymentPreimage: paymentResult.preimage,
        },
      });

      await logEvent(
        "payment",
        `⚡ Human earned ${bounty.rewardSats} sats for "${bounty.title}" — hash: ${paymentResult.paymentHash.substring(0, 16)}...`,
        {
          bountyId,
          rewardSats: bounty.rewardSats,
          paymentHash: paymentResult.paymentHash,
          paymentPreimage: paymentResult.preimage,
          claimedBy: bounty.claimedBy,
        }
      );

      return NextResponse.json({
        id: updated.id,
        status: "completed",
        message: `Paid! ${bounty.rewardSats} sats sent via Lightning.`,
        rewardSats: bounty.rewardSats,
        paymentProof: {
          paymentHash: paymentResult.paymentHash,
          preimage: paymentResult.preimage,
        },
      });
    }

    // No payment method provided or payment failed
    if (paymentError) {
      await logEvent("error", `⚠️ Bounty payment failed: ${paymentError}`, {
        bountyId,
        rewardSats: bounty.rewardSats,
      });
    }

    return NextResponse.json({
      id: updated.id,
      status: "submitted",
      message: paymentError
        ? `Submission received. Payment failed: ${paymentError}. Reward is owed.`
        : `Submission received! Provide a Lightning address or bolt11 invoice to get paid ${bounty.rewardSats} sats.`,
      rewardSats: bounty.rewardSats,
      paymentError,
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
