import { prisma } from "./db";
import type { Provider } from "@prisma/client";

const ROUTING_FEE_PERCENT = 10; // SatsRouter takes 10% of every transaction
const MIN_REPUTATION = 2.5; // Providers below this score are filtered out

/**
 * Select the best provider for a capability.
 * 
 * Routing logic:
 *   1. Filter: only active providers with reputation >= MIN_REPUTATION
 *   2. If no results, fallback to ALL active providers (cold-start tolerance)
 *   3. Sort: reputation DESC, then price ASC
 *   4. Cold-start boost: new providers (< 3 jobs) get a slight rep boost
 *      so they aren't permanently disadvantaged
 */
export async function selectProvider(capability: string): Promise<Provider | null> {
  // Primary query: reputation-gated
  let providers = await prisma.provider.findMany({
    where: {
      capability,
      isActive: true,
      reputationScore: { gte: MIN_REPUTATION },
    },
    orderBy: [
      { reputationScore: "desc" },
      { priceSats: "asc" },
    ],
  });

  // Fallback: if no providers pass the reputation gate, allow all active
  // (prevents dead-end when all providers are new with default 3.0 score)
  if (providers.length === 0) {
    providers = await prisma.provider.findMany({
      where: { capability, isActive: true },
      orderBy: [
        { reputationScore: "desc" },
        { priceSats: "asc" },
      ],
    });
  }

  if (providers.length === 0) return null;

  // Competitive bidding + staking-aware sort:
  //   1. Staked providers get a +0.3 reputation bonus (skin-in-the-game)
  //   2. Cold-start: new providers (< 3 jobs) get +0.5 rep boost
  //   3. Effective price = priceSats * bidMultiplier (lower = more competitive)
  //   4. Sort by: effective reputation DESC, then effective price ASC
  if (providers.length > 1) {
    providers.sort((a, b) => {
      let aScore = a.reputationScore;
      let bScore = b.reputationScore;

      // Staking bonus: staked agents are more trustworthy
      if (a.stakeStatus === "staked") aScore += 0.3;
      if (b.stakeStatus === "staked") bScore += 0.3;

      // Cold-start boost
      if (a.totalJobs < 3) aScore += 0.5;
      if (b.totalJobs < 3) bScore += 0.5;

      // Primary: reputation (with bonuses)
      if (Math.abs(bScore - aScore) > 0.2) return bScore - aScore;

      // Secondary: effective price via bidMultiplier (competitive bidding)
      const aEffective = a.priceSats * (a.bidMultiplier ?? 1.0);
      const bEffective = b.priceSats * (b.bidMultiplier ?? 1.0);
      return aEffective - bEffective;
    });
  }

  return providers[0];
}

export function calcFee(priceSats: number): number {
  return Math.ceil(priceSats * (ROUTING_FEE_PERCENT / 100));
}

export function calcProviderPayout(priceSats: number): number {
  return priceSats - calcFee(priceSats);
}
