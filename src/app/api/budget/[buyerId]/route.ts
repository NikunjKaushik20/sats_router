import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/budget/:buyerId
 * Returns a buyer's current budget state — daily cap, spent today, remaining.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ buyerId: string }> }
) {
  const { buyerId } = await params;

  const buyer = await prisma.buyer.findUnique({
    where: { id: buyerId },
  });

  if (!buyer) {
    return NextResponse.json({ error: "Buyer not found" }, { status: 404 });
  }

  // Auto-reset if new day
  const now = new Date();
  const lastReset = buyer.lastResetDate;
  let spentToday = buyer.spentTodaySats;

  if (
    lastReset.getDate() !== now.getDate() ||
    lastReset.getMonth() !== now.getMonth() ||
    lastReset.getFullYear() !== now.getFullYear()
  ) {
    await prisma.buyer.update({
      where: { id: buyerId },
      data: { spentTodaySats: 0, lastResetDate: now },
    });
    spentToday = 0;
  }

  const remaining = buyer.dailyBudgetSats - spentToday;
  const percentUsed = Math.round((spentToday / buyer.dailyBudgetSats) * 100);

  // Count completed jobs today
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const jobsToday = await prisma.job.count({
    where: {
      buyerId,
      status: { in: ["completed", "paid"] },
      paidAt: { gte: todayStart },
    },
  });

  // Forecasting: calculate average spend per job and estimate remaining capacity
  const avgSpendPerJob = jobsToday > 0 ? Math.round(spentToday / jobsToday) : 0;
  const estimatedJobsLeft = avgSpendPerJob > 0 ? Math.floor(remaining / avgSpendPerJob) : remaining > 0 ? -1 : 0; // -1 = "unknown (no jobs yet)"
  
  // Human-readable forecast
  let burnForecast = "";
  if (remaining <= 0) {
    burnForecast = "Budget exhausted — no more jobs today.";
  } else if (avgSpendPerJob <= 0) {
    burnForecast = `${remaining} sats remaining — no jobs today yet.`;
  } else {
    burnForecast = `At current burn (${avgSpendPerJob} sats/job), Riya can afford ~${estimatedJobsLeft} more jobs today.`;
  }

  return NextResponse.json({
    buyerId: buyer.id,
    name: buyer.name,
    dailyBudgetSats: buyer.dailyBudgetSats,
    spentTodaySats: spentToday,
    remainingSats: remaining,
    percentUsed,
    perIncidentCapSats: buyer.perIncidentCapSats,
    jobsCompletedToday: jobsToday,
    lastResetDate: buyer.lastResetDate.toISOString(),
    // Forecasting
    avgSpendPerJob,
    estimatedJobsLeft,
    burnForecast,
  });
}
