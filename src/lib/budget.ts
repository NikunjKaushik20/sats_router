import { prisma } from "./db";

export async function checkBudget(
  buyerId: string,
  requestedSats: number
): Promise<{ allowed: boolean; reason?: string; remainingAfter?: number }> {
  const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
  if (!buyer) return { allowed: false, reason: "Buyer not found" };

  // Reset daily budget if it's a new day
  const lastReset = buyer.lastResetDate;
  const now = new Date();
  if (
    lastReset.getDate() !== now.getDate() ||
    lastReset.getMonth() !== now.getMonth()
  ) {
    await prisma.buyer.update({
      where: { id: buyerId },
      data: { spentTodaySats: 0, lastResetDate: now },
    });
    buyer.spentTodaySats = 0;
  }

  const newTotal = buyer.spentTodaySats + requestedSats;

  if (newTotal > buyer.dailyBudgetSats) {
    return {
      allowed: false,
      reason: `Daily budget exceeded. Spent: ${buyer.spentTodaySats}, Limit: ${buyer.dailyBudgetSats}`,
    };
  }

  // Per-incident cap: count sats spent in jobs from the last 10 minutes
  const since = new Date(Date.now() - 600_000);
  const incidentJobs = await prisma.job.findMany({
    where: {
      buyerId,
      status: { in: ["paid", "running", "completed"] },
      paidAt: { gte: since },
    },
  });
  const incidentSpent = incidentJobs.reduce((s, j) => s + j.priceSats, 0);
  if (incidentSpent + requestedSats > buyer.perIncidentCapSats) {
    return {
      allowed: false,
      reason: `Per-incident cap reached. Incident spend: ${incidentSpent}, Cap: ${buyer.perIncidentCapSats}`,
    };
  }

  return { allowed: true, remainingAfter: buyer.dailyBudgetSats - newTotal };
}

export async function deductBudget(buyerId: string, sats: number): Promise<void> {
  await prisma.buyer.update({
    where: { id: buyerId },
    data: { spentTodaySats: { increment: sats } },
  });
}
