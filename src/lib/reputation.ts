import { prisma } from "./db";

/**
 * Weighted moving average reputation update.
 * Success = 5.0 rating, Failure = 1.0 rating.
 * Score converges over time based on real performance.
 */
export async function updateReputation(
  providerId: string,
  success: boolean
): Promise<void> {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return;

  const totalJobs = provider.totalJobs + 1;
  const newRating = success ? 5.0 : 1.0;
  const newScore =
    (provider.reputationScore * provider.totalJobs + newRating) / totalJobs;

  await prisma.provider.update({
    where: { id: providerId },
    data: {
      reputationScore: Math.round(newScore * 100) / 100,
      totalJobs,
    },
  });
}
