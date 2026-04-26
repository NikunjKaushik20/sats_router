import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRecentEvents } from "@/lib/events";

/**
 * GET /api/dashboard — All data needed for the real-time dashboard
 */
export async function GET() {
  const [providers, recentEvents, jobs, allJobs, bountyStats] = await Promise.all([
    prisma.provider.findMany({
      orderBy: { reputationScore: "desc" },
      select: {
        id: true,
        name: true,
        description: true,
        capability: true,
        priceSats: true,
        reputationScore: true,
        totalJobs: true,
        isActive: true,
        payoutLightningAddress: true,
        totalEarnedSats: true,
      },
    }),
    getRecentEvents(40),
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { provider: true },
    }),
    prisma.job.findMany({
      where: { status: { in: ["completed", "paid", "running"] } },
      select: {
        priceSats: true,
        feeSats: true,
        payoutHash: true,
        payoutSats: true,
      },
    }),
    // Bounty market stats
    prisma.bounty.groupBy({
      by: ["status"],
      _count: true,
      _sum: { rewardSats: true },
    }),
  ]);

  const totalSatsMoved = allJobs.reduce((s, j) => s + j.priceSats, 0);
  const totalSatsEarned = allJobs.reduce((s, j) => s + j.feeSats, 0);
  const totalPayoutsSent = allJobs
    .filter((j) => j.payoutHash)
    .reduce((s, j) => s + j.payoutSats, 0);
  const provenPayouts = allJobs.filter((j) => j.payoutHash).length;

  const openBounties = bountyStats.find((s) => s.status === "open")?._count || 0;
  const completedBounties = bountyStats.find((s) => s.status === "completed")?._count || 0;
  const humanSatsPaid = bountyStats.find((s) => s.status === "completed")?._sum.rewardSats || 0;

  return NextResponse.json({
    providers,
    recentEvents: recentEvents.map((e) => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })),
    stats: {
      totalJobs: allJobs.length,
      totalSatsEarned,
      totalSatsMoved,
      totalPayoutsSent,
      provenPayouts,
      activeProviders: providers.filter((p) => p.isActive).length,
      openBounties,
      completedBounties,
      humanSatsPaid,
    },
    recentJobs: jobs.map((j) => ({
      id: j.id,
      capability: j.capability,
      status: j.status,
      priceSats: j.priceSats,
      providerName: j.provider.name,
      createdAt: j.createdAt.toISOString(),
      paymentHash: j.paymentHash ?? null,
      paymentPreimage: j.paymentPreimage ?? null,
      payoutHash: j.payoutHash ?? null,
      payoutPreimage: j.payoutPreimage ?? null,
      payoutSats: j.payoutSats,
    })),
  });
}
