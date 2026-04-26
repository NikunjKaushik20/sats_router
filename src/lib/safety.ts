import crypto from "crypto";
import { prisma } from "./db";

export function hashInput(input: Record<string, unknown>): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

/**
 * Returns true if this exact call happened >=3 times in the last 60 seconds.
 * Protects buyer budgets from runaway loops.
 */
export async function isDuplicateLoop(
  buyerId: string,
  capability: string,
  inputHash: string
): Promise<boolean> {
  const since = new Date(Date.now() - 60_000);
  const count = await prisma.recentCall.count({
    where: { buyerId, capability, inputHash, calledAt: { gte: since } },
  });
  return count >= 3;
}

export async function recordCall(
  buyerId: string,
  capability: string,
  inputHash: string
): Promise<void> {
  await prisma.recentCall.create({
    data: { buyerId, capability, inputHash },
  });
  // Clean up old records (keep last 5 minutes only)
  const cutoff = new Date(Date.now() - 300_000);
  await prisma.recentCall.deleteMany({ where: { calledAt: { lt: cutoff } } });
}
