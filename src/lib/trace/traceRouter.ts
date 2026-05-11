/**
 * TRACE v2.3 Router — Temporal-Causal Trust Evolution
 *
 * v2.3 changes:
 *   - Temporal risk penalty (trust velocity, acceleration, entropy trajectory)
 *   - Reciprocal amplification detection in utility
 *   - Diversity maturity weighting (organic vs artificial diversification)
 *   - Economic depth bonus (mature agents get routing preference)
 *
 * v2.2 features (maintained):
 *   - Scale-aware penalty scaling, confidence-gated entropy
 *   - Causal penalty multiplier (root-cause vs collateral)
 *
 * v2.1/v2 features (maintained):
 *   - Sybil-dampened network trust, clique penalty
 *   - Volatility penalty, progressive trust unlocking
 */

import { prisma } from "../db";
import type { Provider } from "@prisma/client";
import {
  ROUTING_UTILITY,
  ROUTING_CONSTRAINTS,
  EXPLORATION_CONFIG,
  COLD_START,
  PROGRESSIVE_TRUST,
  VOLATILITY,
  TRACE_MAX_SCORE,
  type RoutingPolicy,
} from "./config";
import { computeCounterpartyEntropy } from "./trustGraph";
import {
  computeScaleFactor,
  effectiveCliquePenalty,
  effectiveSybilPenalty,
  computeEntropyConfidence,
} from "./adaptiveConfig";
import { causalGraph } from "./causalGraph";
import { temporalEngine } from "./temporalTrust";
import { logEvent } from "../events";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CandidateScore {
  providerId: string;
  providerName: string;
  utility: number;
  rejected: boolean;
  reason?: string;
  breakdown: {
    traceContribution: number;
    defaultPenalty: number;
    costPenalty: number;
    networkBonus: number;
    sybilPenalty: number;
    cliquePenalty: number;
    causalSuspicion: number;
    temporalRiskPenalty: number;       // v2.3: trust velocity + acceleration + entropy trajectory
    reciprocalRisk: number;            // v2.3: mutual amplification risk
    volatilityPenalty: number;
    capabilityBonus: number;
    coldStartBonus: number;
    progressiveTrustCap: number;
    diversityScore: number;
    diversityMaturity: number;          // v2.3: organic vs artificial diversification [0,1]
    economicDepth: number;              // v2.3: log-scaled trust investment [0,1]
    entropyConfidence: number;
    scaleFactor: number;
    causalMultiplier: number;
  };
}

export interface RoutingResult {
  provider: Provider;
  utility: number;
  candidates: CandidateScore[];
  policy: RoutingPolicy;
  selectionMode: "utility" | "exploration" | "fallback";
  epsilon: number;
}

export interface RoutingExplorationOptions {
  enabled?: boolean;
  round?: number;
  random?: () => number;
}

// ─── TRACE Provider Selection ─────────────────────────────────────────────────

export async function selectProviderTRACE(
  capability: string,
  policy: RoutingPolicy = "TRACE",
  experimentId?: string,
  jobId?: string,
  exploration?: RoutingExplorationOptions
): Promise<RoutingResult | null> {
  // Step 1: Get all active providers for this capability
  const providers = await prisma.provider.findMany({
    where: {
      capability,
      isActive: true,
    },
  });

  if (providers.length === 0) return null;

  // Step 2–4: Score all candidates (v2.1: async for entropy queries)
  const candidates = await scoreAllCandidates(providers, policy, providers.length);

  // Step 5: Select highest-utility non-rejected candidate
  const eligible = candidates.filter((c) => !c.rejected && c.utility >= 0);

  if (eligible.length === 0) {
    // Fallback: if ALL providers are rejected by constraints, relax to best available
    await logEvent("route", `⚠️ TRACE v2: All ${providers.length} providers filtered out for ${capability} — falling back`, {
      capability,
      policy,
      candidateCount: providers.length,
      allRejected: true,
      rejectionReasons: candidates.map((c) => ({ id: c.providerId, reason: c.reason })),
    });

    candidates.sort((a, b) => b.utility - a.utility);
    const fallback = candidates[0];
    if (fallback) {
      const provider = providers.find((p) => p.id === fallback.providerId)!;
      fallback.rejected = false;
      fallback.reason = "constraint_relaxed";

      await logRoutingDecision(capability, provider.id, fallback.utility, candidates, policy, experimentId, jobId);
      return { provider, utility: fallback.utility, candidates, policy, selectionMode: "fallback", epsilon: 0 };
    }
    return null;
  }

  eligible.sort((a, b) => b.utility - a.utility);
  const epsilon = computeExplorationEpsilon(exploration?.round ?? 0);
  const rand = exploration?.random ?? Math.random;
  const shouldExplore =
    exploration?.enabled === true
    && eligible.length >= EXPLORATION_CONFIG.minExplorationCandidates
    && rand() < epsilon;
  const winner = shouldExplore
    ? eligible[Math.floor(rand() * eligible.length)]
    : eligible[0];
  const provider = providers.find((p) => p.id === winner.providerId)!;
  const selectionMode = shouldExplore ? "exploration" : "utility";

  // Step 6: Log routing decision
  await logRoutingDecision(capability, provider.id, winner.utility, candidates, policy, experimentId, jobId);

  await logEvent("route", `🎯 TRACE v2 routed ${capability} → ${provider.name} (utility: ${winner.utility.toFixed(2)}, tier: ${provider.riskTier})`, {
    capability,
    providerId: provider.id,
    providerName: provider.name,
    traceScore: provider.traceScore,
    riskTier: provider.riskTier,
    utility: winner.utility,
    policy,
    selectionMode,
    epsilon,
    candidatesEvaluated: candidates.length,
    candidatesRejected: candidates.filter((c) => c.rejected).length,
    sybilRisk: provider.sybilRisk,
  });

  if (winner.utility < 0.10 || provider.traceScore < 500) {
    console.log(`[DEBUG] Low utility/score winner: ${provider.name} (score: ${provider.traceScore}, util: ${winner.utility})`);
    console.log(JSON.stringify(winner.breakdown, null, 2));
  }

  return { provider, utility: winner.utility, candidates, policy, selectionMode, epsilon };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

async function scoreAllCandidates(
  providers: Provider[],
  policy: RoutingPolicy,
  networkSize: number
): Promise<CandidateScore[]> {
  const maxPrice = Math.max(...providers.map((p) => p.priceSats), 1);

  const candidatePromises = providers.map(async (p) => {
    const candidate: CandidateScore = {
      providerId: p.id,
      providerName: p.name,
      utility: 0,
      rejected: false,
      breakdown: {
        traceContribution: 0,
        defaultPenalty: 0,
        costPenalty: 0,
        networkBonus: 0,
        sybilPenalty: 0,
        cliquePenalty: 0,
        causalSuspicion: 0,
        temporalRiskPenalty: 0,
        reciprocalRisk: 0,
        volatilityPenalty: 0,
        capabilityBonus: 0,
        coldStartBonus: 0,
        progressiveTrustCap: 1.0,
        diversityScore: 1.0,
        diversityMaturity: 1.0,
        economicDepth: 0,
        entropyConfidence: 1.0,
        scaleFactor: 1.0,
        causalMultiplier: 1.0,
      },
    };

    // ─── TRACE-Only Hard Constraint Filtering ──────────────────────
    // Baseline policies must not inherit TRACE's risk gates; otherwise the
    // comparison understates TRACE's routing and fraud-suppression advantage.
    if (policy === "TRACE") {


      if (p.traceScore < ROUTING_CONSTRAINTS.minTraceScore) {
        candidate.rejected = true;
        candidate.reason = `trace_score_too_low: ${p.traceScore} < ${ROUTING_CONSTRAINTS.minTraceScore}`;
        return candidate;
      }

      if (p.defaultProbability > ROUTING_CONSTRAINTS.maxDefaultProbability) {
        candidate.rejected = true;
        candidate.reason = `default_prob_too_high: ${p.defaultProbability} > ${ROUTING_CONSTRAINTS.maxDefaultProbability}`;
        return candidate;
      }

      // v2: TIGHTENED sybil hard threshold
      if (p.sybilRisk > ROUTING_CONSTRAINTS.maxSybilRisk) {
        candidate.rejected = true;
        candidate.reason = `sybil_risk_too_high: ${p.sybilRisk} > ${ROUTING_CONSTRAINTS.maxSybilRisk}`;
        return candidate;
      }

      if (p.disputedJobs > ROUTING_CONSTRAINTS.maxActiveDisputes) {
        candidate.rejected = true;
        candidate.reason = `too_many_disputes: ${p.disputedJobs} > ${ROUTING_CONSTRAINTS.maxActiveDisputes}`;
        return candidate;
      }

      if (p.totalJobs < PROGRESSIVE_TRUST.minJobsForFullAccess && p.defaultProbability > 0.3) {
        candidate.rejected = true;
        candidate.reason = "cold_start_high_risk";
        return candidate;
      }


    }

    // Compute utility based on policy
    switch (policy) {
      case "TRACE":
        await computeTraceUtility(candidate, p, maxPrice, networkSize);
        break;
      case "REPUTATION":
        computeReputationUtility(candidate, p, maxPrice);
        break;
      case "PRICE":
        computePriceUtility(candidate, p, maxPrice);
        break;
      case "STAKE_WEIGHTED":
        computeStakeWeightedUtility(candidate, p, maxPrice);
        break;
    }

    return candidate;
  });

  // v2.1: Await all async utility computations (entropy queries run concurrently)
  return Promise.all(candidatePromises);
}

/**
 * TRACE v2.3 Routing Utility:
 *
 *   U = α·(traceScore/1000)
 *     − β·defaultProb
 *     − γ·(cost/maxCost)
 *     + δ·(networkTrust × diversityScore × diversityMaturity × (1 − sybilRisk))  ← v2.3: MATURITY-WEIGHTED
 *     − λ_eff·sybilRisk
 *     − μ_eff·cliquePenalty × causalMultiplier
 *     − causalSuspicion
 *     − temporalRiskPenalty                                    ← v2.3: NEW
 *     − reciprocalRisk                                         ← v2.3: NEW
 *     − ζ·volatilityPenalty
 *     + ε·capabilityMatch
 *     + coldStartBonus
 *     + economicDepthBonus                                     ← v2.3: NEW
 */
async function computeTraceUtility(
  candidate: CandidateScore,
  p: Provider,
  maxPrice: number,
  networkSize?: number
): Promise<void> {
  const u = ROUTING_UTILITY;
  const N = networkSize ?? 50;

  // Normalize TRACE score to [0, 1]
  const normalizedTrace = p.traceScore / TRACE_MAX_SCORE;

  // Normalize cost
  const effectivePrice = p.priceSats * (p.bidMultiplier ?? 1.0);
  const normalizedCost = effectivePrice / maxPrice;

  // Capability match
  const capabilityMatch = 1.0;

  // Cold-start exploration bonus — SUPPRESS if agent has failures
  let coldStartBonus = 0;
  if (p.totalJobs < COLD_START.maxJobsForBonus && p.failedJobs === 0) {
    const bonusFraction = 1 - (p.totalJobs / COLD_START.maxJobsForBonus);
    coldStartBonus = (COLD_START.explorationBonus / TRACE_MAX_SCORE) * bonusFraction;
  }

  // v2.1: Counterparty entropy
  const { diversityScore } = await computeCounterpartyEntropy(p.id);

  // v2.2: Confidence gating + scale factor
  const totalInteractions = p.totalJobs;
  const entropyConfidence = computeEntropyConfidence(totalInteractions);
  const scaleFactor = computeScaleFactor(N);
  const causalMultiplier = causalGraph.getCausalPenaltyMultiplier(p.id);

  // v2.3: Temporal-causal profile
  const temporalProfile = temporalEngine.computeProfile(p.id);
  const temporalRiskPenalty = temporalEngine.getTemporalPenalty(p.id);
  const reciprocalRisk = temporalProfile.reciprocalAmplificationRisk * 0.1;
  const diversityMaturity = temporalProfile.diversityMaturity;
  const economicDepth = temporalProfile.economicDepth;

  // v2.3: MATURITY-WEIGHTED diversity-adjusted network trust
  // diversityMaturity dampens trust for agents with artificial diversification
  const adjustedTrust = p.networkTrust * diversityScore * diversityMaturity * (1 - p.sybilRisk);

  // v2.2: Scale-aware sybil penalty
  const sybilPenalty = effectiveSybilPenalty(N) * p.sybilRisk;

  // v2.2: Scale-aware, confidence-gated, causally-weighted clique penalty
  let cliquePenalty = 0;
  if (p.totalJobs >= PROGRESSIVE_TRUST.minJobsForFullAccess) {
    const entropyDeficit = Math.max(0, 1 - diversityScore);
    const confidenceGatedDeficit = entropyConfidence * entropyDeficit;
    const mu_eff = effectiveCliquePenalty(N);
    cliquePenalty = mu_eff * confidenceGatedDeficit * causalMultiplier;
  }

  // v2.2: Causal suspicion
  const causalSuspicion = causalGraph.getCausalSuspicion(p.id) * scaleFactor * 0.1;

  // v2: Volatility penalty — only penalize if agent has high failure rate or low score
  let volatilityPenalty = 0;
  if (p.completionRate < 0.85 || p.traceScore < 500) {
    const normalizedVolatility = Math.min(p.scoreVolatility / VOLATILITY.maxAcceptableVolatility, 1.0);
    volatilityPenalty = VOLATILITY.volatilityPenaltyWeight * normalizedVolatility;
  }

  // v2.3: Economic depth bonus — mature agents get small routing advantage
  const economicDepthBonus = economicDepth * 0.03;

  candidate.breakdown = {
    traceContribution: round4(u.alpha_traceScore * normalizedTrace),
    defaultPenalty:     round4(u.beta_defaultRisk * p.defaultProbability),
    costPenalty:        round4(u.gamma_cost * normalizedCost),
    networkBonus:       round4(u.delta_networkTrust * adjustedTrust),
    sybilPenalty:       round4(sybilPenalty),
    cliquePenalty:      round4(cliquePenalty),
    causalSuspicion:    round4(causalSuspicion),
    temporalRiskPenalty: round4(temporalRiskPenalty),
    reciprocalRisk:     round4(reciprocalRisk),
    volatilityPenalty:  round4(volatilityPenalty),
    capabilityBonus:    round4(u.epsilon_capability * capabilityMatch),
    coldStartBonus:     round4(coldStartBonus),
    progressiveTrustCap: 1.0,
    diversityScore:     round4(diversityScore),
    diversityMaturity:  round4(diversityMaturity),
    economicDepth:      round4(economicDepth),
    entropyConfidence:  round4(entropyConfidence),
    scaleFactor:        round4(scaleFactor),
    causalMultiplier:   round4(causalMultiplier),
  };

  let rawUtility =
    candidate.breakdown.traceContribution
    - candidate.breakdown.defaultPenalty
    - candidate.breakdown.costPenalty
    + candidate.breakdown.networkBonus
    - candidate.breakdown.sybilPenalty
    - candidate.breakdown.cliquePenalty
    - candidate.breakdown.causalSuspicion
    - candidate.breakdown.temporalRiskPenalty     // v2.3: temporal risk
    - candidate.breakdown.reciprocalRisk          // v2.3: reciprocal amplification
    - candidate.breakdown.volatilityPenalty
    + candidate.breakdown.capabilityBonus
    + candidate.breakdown.coldStartBonus
    + economicDepthBonus;                          // v2.3: maturity bonus

  // Probe-default detection: even low default rates accumulate evidence
  const recentFailureRate = p.failedJobs > 0 && p.totalJobs > 3
    ? p.failedJobs / p.totalJobs : 0;
  if (recentFailureRate > 0.10 && p.totalJobs >= 5) {
    // Agent has >10% failure rate with enough history — penalize utility
    rawUtility -= 0.05 * (recentFailureRate / 0.15);
  }

  // v2.5: Completion-rate penalty — clean observable signal.
  const completionDeficit = 1 - p.completionRate;
  if (p.totalJobs >= 3 && completionDeficit > 0.12) {
    rawUtility -= 0.04 + 0.09 * Math.min((completionDeficit - 0.12) / 0.28, 1.0);
  }

  // v2.5: Compound sybil-failure risk
  if (p.sybilRisk > 0.15 && p.failedJobs > 0 && p.totalJobs > 0) {
    const failureRate = p.failedJobs / p.totalJobs;
    rawUtility -= p.sybilRisk * failureRate * 0.30;
  }

  // v2: Progressive trust unlocking
  const progressiveCap = computeProgressiveTrustCap(p);
  candidate.breakdown.progressiveTrustCap = round4(progressiveCap);
  rawUtility *= progressiveCap;

  candidate.utility = round4(rawUtility);
}

/**
 * v2: Progressive trust unlocking.
 * New agents have their utility capped proportionally to their job history.
 * Returns a multiplier in [0.1, 1.0].
 */
function computeProgressiveTrustCap(p: Provider): number {
  if (p.totalJobs >= PROGRESSIVE_TRUST.minJobsForFullAccess) {
    // Mature agents with very high failure rates still get penalized
    const matureFailureRate = p.totalJobs > 0 ? p.failedJobs / p.totalJobs : 0;
    if (matureFailureRate > 0.25) {
      return Math.max(0.10, 1.0 - (matureFailureRate - 0.25));
    }
    return 1.0;
  }

  // Each failure cancels 2 successes' worth of trust progress
  const effectiveJobs = Math.max(0, p.successfulJobs - p.failedJobs * 2);
  let access = effectiveJobs * PROGRESSIVE_TRUST.accessScalePerJob;

  if (p.stakeSats > 0) {
    access *= PROGRESSIVE_TRUST.stakeBoostMultiplier;
  }

  if (p.scoreVolatility > VOLATILITY.maxAcceptableVolatility * 1.5) {
    return 0.05;
  }
  return Math.min(Math.max(access, 0.10), 1.0);
}

/**
 * Baseline: reputation-only routing (for A/B experiments).
 */
function computeReputationUtility(
  candidate: CandidateScore,
  p: Provider,
  maxPrice: number
): void {
  const normalizedRep = p.reputationScore / 5.0;
  const effectivePrice = p.priceSats * (p.bidMultiplier ?? 1.0);
  const normalizedCost = effectivePrice / maxPrice;

  const stakeBonus = p.stakeStatus === "staked" ? 0.06 : 0;
  const coldStart = p.totalJobs < 3 ? 0.10 : 0;

  candidate.breakdown = {
    traceContribution: round4(normalizedRep),
    defaultPenalty: 0,
    costPenalty: round4(normalizedCost * 0.3),
    networkBonus: round4(stakeBonus),
    sybilPenalty: 0,
    cliquePenalty: 0,
    causalSuspicion: 0,
    temporalRiskPenalty: 0,
    reciprocalRisk: 0,
    volatilityPenalty: 0,
    capabilityBonus: 0,
    coldStartBonus: round4(coldStart),
    progressiveTrustCap: 1.0,
    diversityScore: 1.0,
    diversityMaturity: 1.0,
    economicDepth: 0,
    entropyConfidence: 1.0,
    scaleFactor: 1.0,
    causalMultiplier: 1.0,
  };

  candidate.utility = round4(
    normalizedRep + stakeBonus + coldStart - normalizedCost * 0.3
  );
}

/**
 * Baseline: price-only routing (for A/B experiments).
 */
function computePriceUtility(
  candidate: CandidateScore,
  p: Provider,
  maxPrice: number
): void {
  const effectivePrice = p.priceSats * (p.bidMultiplier ?? 1.0);
  const normalizedCost = effectivePrice / maxPrice;

  candidate.breakdown = {
    traceContribution: 0,
    defaultPenalty: 0,
    costPenalty: round4(normalizedCost),
    networkBonus: 0,
    sybilPenalty: 0,
    cliquePenalty: 0,
    causalSuspicion: 0,
    temporalRiskPenalty: 0,
    reciprocalRisk: 0,
    volatilityPenalty: 0,
    capabilityBonus: 0,
    coldStartBonus: 0,
    progressiveTrustCap: 1.0,
    diversityScore: 1.0,
    diversityMaturity: 1.0,
    economicDepth: 0,
    entropyConfidence: 1.0,
    scaleFactor: 1.0,
    causalMultiplier: 1.0,
  };

  candidate.utility = round4(1 - normalizedCost);
}

/**
 * Baseline: stake-weighted reputation routing.
 * This approximates deployed decentralized-market systems where economic
 * collateral and historical performance jointly determine provider priority.
 */
function computeStakeWeightedUtility(
  candidate: CandidateScore,
  p: Provider,
  maxPrice: number
): void {
  const effectivePrice = p.priceSats * (p.bidMultiplier ?? 1.0);
  const normalizedCost = effectivePrice / maxPrice;
  const normalizedRep = p.reputationScore / 5.0;
  const stakeSignal = Math.min(Math.log2(1 + p.stakeSats) / Math.log2(1 + 500), 1);
  const volumeSignal = Math.min(Math.log2(1 + p.totalEconomicVolume) / Math.log2(1 + 1000), 1);

  candidate.breakdown = {
    traceContribution: round4(normalizedRep),
    defaultPenalty: 0,
    costPenalty: round4(normalizedCost * 0.2),
    networkBonus: round4(0.35 * stakeSignal + 0.15 * volumeSignal),
    sybilPenalty: 0,
    cliquePenalty: 0,
    causalSuspicion: 0,
    temporalRiskPenalty: 0,
    reciprocalRisk: 0,
    volatilityPenalty: 0,
    capabilityBonus: 0,
    coldStartBonus: 0,
    progressiveTrustCap: 1.0,
    diversityScore: 1.0,
    diversityMaturity: 1.0,
    economicDepth: round4(volumeSignal),
    entropyConfidence: 1.0,
    scaleFactor: 1.0,
    causalMultiplier: 1.0,
  };

  candidate.utility = round4(
    0.5 * normalizedRep + 0.35 * stakeSignal + 0.15 * volumeSignal - 0.2 * normalizedCost
  );
}

// ─── Routing Decision Instrumentation ─────────────────────────────────────────

async function logRoutingDecision(
  capability: string,
  selectedProviderId: string,
  utilityScore: number,
  candidates: CandidateScore[],
  policy: RoutingPolicy,
  experimentId?: string,
  jobId?: string
): Promise<void> {
  await prisma.routingDecision.create({
    data: {
      jobId: jobId ?? null,
      capability,
      selectedProviderId,
      utilityScore: round4(utilityScore),
      candidateScores: JSON.stringify(candidates),
      routingPolicy: policy,
      experimentId: experimentId ?? null,
    },
  });
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function computeExplorationEpsilon(round: number): number {
  const cfg = EXPLORATION_CONFIG;
  const progress = Math.min(Math.max(round, 0), cfg.decayRounds) / cfg.decayRounds;
  return round4(cfg.epsilonStart + (cfg.epsilonEnd - cfg.epsilonStart) * progress);
}
