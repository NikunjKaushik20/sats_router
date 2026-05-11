/**
 * TRACE Score Engine — Phase 2
 *
 * Replaces simplistic reputation with economic trust scoring.
 *
 * Core functions:
 *   - computeTraceScore()       → composite [0–1000] trust score
 *   - computeDefaultProbability() → P(default) [0–1]
 *   - computeRiskTier()         → A/B/C/D tier
 *   - updateScoreAfterEvent()   → recalculate + persist after economic events
 */

import { prisma } from "../db";
import {
  TRACE_WEIGHTS,
  TRACE_MAX_SCORE,
  TRACE_MIN_SCORE,
  RISK_TIERS,
  DEFAULT_PROB_WEIGHTS,
  RECENT_FAILURE,
  SCORE_DELTAS,
  type RiskTier,
} from "./config";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TraceScoreInput {
  completionRate: number;       // [0–1]
  repaymentRate: number;        // [0–1]
  networkTrust: number;         // [0–1]
  stakeRatio: number;           // [0–1]
  successfulEscrowRate: number; // [0–1]
  defaultProbability: number;   // [0–1]
  sybilRisk: number;            // [0–1]
  disputeRate: number;          // [0–1]
}

export interface TraceScoreResult {
  traceScore: number;
  riskTier: RiskTier;
  defaultProbability: number;
  breakdown: {
    completionContribution: number;
    repaymentContribution: number;
    networkTrustContribution: number;
    stakeContribution: number;
    escrowContribution: number;
    defaultPenalty: number;
    sybilPenalty: number;
    disputePenalty: number;
  };
}

// ─── Score Computation ────────────────────────────────────────────────────────

/**
 * Compute the TRACE score from raw metrics.
 *
 * Formula:
 *   TRACE_Score = BASE + MAX·[
 *     w1·completionRate + w2·repaymentRate + w3·networkTrust
 *     + w4·stakeRatio + w5·successfulEscrowRate
 *     − w6·defaultProbability − w7·sybilRisk − w8·disputeRate
 *   ]
 *
 * Result is clamped to [0, 1000].
 */
export function computeTraceScore(input: TraceScoreInput): TraceScoreResult {
  const w = TRACE_WEIGHTS;

  // Positive contributions (each metric ∈ [0,1])
  const completionContribution   = w.w1_completionRate * input.completionRate;
  const repaymentContribution    = w.w2_repaymentRate * input.repaymentRate;
  const networkTrustContribution = w.w3_networkTrust * input.networkTrust;
  const stakeContribution        = w.w4_stakeRatio * input.stakeRatio;
  const escrowContribution       = w.w5_successfulEscrowRate * input.successfulEscrowRate;

  // Negative penalties
  const defaultPenalty = w.w6_defaultProbability * input.defaultProbability;
  const sybilPenalty   = w.w7_sybilRisk * input.sybilRisk;
  const disputePenalty = w.w8_disputeRate * input.disputeRate;

  // Sum positive weights: 0.25 + 0.20 + 0.15 + 0.10 + 0.15 = 0.85
  const positiveSum = completionContribution + repaymentContribution
    + networkTrustContribution + stakeContribution + escrowContribution;

  // Sum negative weights: 0.20 + 0.15 + 0.10 = 0.45
  const negativeSum = defaultPenalty + sybilPenalty + disputePenalty;

  // Net signal: positive contributions minus penalties
  // At perfect behaviour (all 1.0 positive, all 0.0 negative): net = 0.85
  // Scale to [0, 1000]
  const netSignal = positiveSum - negativeSum;
  // Map the signal range [-0.45, 0.85] → [0, 1000]
  const signalRange = 0.85 + 0.45; // 1.30 total range
  const normalized = (netSignal + 0.45) / signalRange;
  const rawScore = normalized * TRACE_MAX_SCORE;

  const traceScore = clamp(Math.round(rawScore * 100) / 100, TRACE_MIN_SCORE, TRACE_MAX_SCORE);
  const riskTier = computeRiskTier(traceScore);
  const defaultProbability = input.defaultProbability;

  return {
    traceScore,
    riskTier,
    defaultProbability,
    breakdown: {
      completionContribution: round4(completionContribution),
      repaymentContribution: round4(repaymentContribution),
      networkTrustContribution: round4(networkTrustContribution),
      stakeContribution: round4(stakeContribution),
      escrowContribution: round4(escrowContribution),
      defaultPenalty: round4(defaultPenalty),
      sybilPenalty: round4(sybilPenalty),
      disputePenalty: round4(disputePenalty),
    },
  };
}

/**
 * Compute P(default) from provider history.
 *
 * Inputs:
 *   - repayment failures (jobs where escrow was refunded or defaulted)
 *   - dispute count
 *   - recent instability (score volatility in the last 24h)
 *   - stake size (higher stake → lower default prob)
 *   - economic history depth
 */
export function computeDefaultProbability(provider: {
  totalJobs: number;
  failedJobs: number;
  defaultedJobs: number;
  disputedJobs: number;
  scoreVolatility: number;
  stakeSats: number;
  totalEconomicVolume: number;
  repaymentRate: number;
  recentFailureSignal?: number;
}): number {
  if (provider.totalJobs === 0) return 0.20; // Baseline for new providers (matches max history penalty)

  const w = DEFAULT_PROB_WEIGHTS;

  // Repayment failure signal: inversely proportional to repayment rate
  const repaymentFailure = 1.0 - provider.repaymentRate;

  // Dispute signal: fraction of jobs with disputes
  const disputeSignal = provider.totalJobs > 0
    ? provider.disputedJobs / provider.totalJobs
    : 0;

  // Recent instability: high score volatility → higher default risk
  // Normalize volatility to [0,1] — volatility > 100 is max
  const instabilitySignal = Math.min(provider.scoreVolatility / 100, 1.0);

  // Stake signal: more stake → less likely to default
  // High stake ratio → penalty is low; no stake → penalty is high
  const stakeRatio = provider.totalEconomicVolume > 0
    ? provider.stakeSats / provider.totalEconomicVolume
    : (provider.stakeSats > 0 ? 0.5 : 0);
  const stakePenalty = 1.0 - Math.min(stakeRatio * 10, 1.0); // Cap at 10x coverage

  // Economic history: deeper history → more confident, less punitive
  // New providers get slightly higher default prob due to uncertainty
  const historyDepth = Math.min(provider.totalJobs / 20, 1.0); // Normalize to [0,1]
  const historyPenalty = 1.0 - historyDepth;

  const recentFailureSignal = provider.recentFailureSignal ?? 0;
  const amplifiedRepaymentFailure = Math.min(
    repaymentFailure * (1 + recentFailureSignal * (RECENT_FAILURE.amplificationMultiplier - 1)),
    1.0
  );

  const rawProb =
    w.repaymentFailureWeight * amplifiedRepaymentFailure +
    w.disputeWeight * disputeSignal +
    w.recentInstabilityWeight * instabilitySignal +
    w.stakePenaltyWeight * stakePenalty +
    w.historyWeight * historyPenalty;

  return clamp(Math.round(rawProb * 10000) / 10000, 0, 1);
}

/**
 * Derive risk tier from TRACE score.
 */
export function computeRiskTier(traceScore: number): RiskTier {
  if (traceScore >= RISK_TIERS.A.min) return "A";
  if (traceScore >= RISK_TIERS.B.min) return "B";
  if (traceScore >= RISK_TIERS.C.min) return "C";
  return "D";
}

// ─── Score Update Engine ──────────────────────────────────────────────────────

export type EconomicEventType = keyof typeof SCORE_DELTAS;

/**
 * Update a provider's TRACE score after an economic event.
 *
 * Steps:
 *   1. Log the EconomicEvent
 *   2. Recompute provider metrics (completionRate, etc.) from job history
 *   3. Recompute TRACE score
 *   4. Persist updated provider fields
 *   5. Persist ScoreHistory snapshot
 *
 * This is the primary entry point — call after every routing/payment/escrow event.
 */
export async function updateScoreAfterEvent(
  providerId: string,
  eventType: EconomicEventType,
  jobId?: string,
  amountSats: number = 0,
  metadata: Record<string, unknown> = {}
): Promise<TraceScoreResult | null> {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) return null;

  // Step 1: Log economic event
  await prisma.economicEvent.create({
    data: {
      providerId,
      jobId: jobId ?? null,
      eventType,
      amountSats,
      metadata: JSON.stringify(metadata),
    },
  });

  // Step 2: Recompute provider metrics from actual data
  const metrics = await recomputeMetrics(providerId);

  // Step 3: Compute default probability
  const defaultProbability = computeDefaultProbability({
    totalJobs: metrics.totalJobs,
    failedJobs: metrics.failedJobs,
    defaultedJobs: metrics.defaultedJobs,
    disputedJobs: metrics.disputedJobs,
    scoreVolatility: provider.scoreVolatility,
    stakeSats: provider.stakeSats,
    totalEconomicVolume: metrics.totalEconomicVolume,
    repaymentRate: metrics.repaymentRate,
    recentFailureSignal: metrics.recentFailureSignal,
  });

  // Step 4: Compute TRACE score
  const result = computeTraceScore({
    completionRate: metrics.completionRate,
    repaymentRate: metrics.repaymentRate,
    networkTrust: provider.networkTrust, // Graph-derived — updated separately
    stakeRatio: metrics.stakeRatio,
    successfulEscrowRate: metrics.successfulEscrowRate,
    defaultProbability,
    sybilRisk: provider.sybilRisk, // Graph-derived — updated separately
    disputeRate: metrics.disputeRate,
  });

  // Step 5: Compute score volatility (stddev of last 10 score changes)
  const recentScores = await prisma.scoreHistory.findMany({
    where: { providerId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { traceScore: true },
  });
  const volatility = computeVolatility(recentScores.map((s) => s.traceScore), result.traceScore);

  // Step 6: Persist updated provider
  await prisma.provider.update({
    where: { id: providerId },
    data: {
      traceScore: result.traceScore,
      riskTier: result.riskTier,
      defaultProbability: result.defaultProbability,
      completionRate: metrics.completionRate,
      repaymentRate: metrics.repaymentRate,
      successfulEscrowRate: metrics.successfulEscrowRate,
      disputeRate: metrics.disputeRate,
      stakeRatio: metrics.stakeRatio,
      scoreVolatility: volatility,
      totalJobs: metrics.totalJobs,
      totalEconomicVolume: metrics.totalEconomicVolume,
      successfulJobs: metrics.successfulJobs,
      failedJobs: metrics.failedJobs,
      defaultedJobs: metrics.defaultedJobs,
      disputedJobs: metrics.disputedJobs,
    },
  });

  // Step 7: Persist score history snapshot
  await prisma.scoreHistory.create({
    data: {
      providerId,
      traceScore: result.traceScore,
      riskTier: result.riskTier,
      defaultProbability: result.defaultProbability,
      completionRate: metrics.completionRate,
      repaymentRate: metrics.repaymentRate,
      networkTrust: provider.networkTrust,
      sybilRisk: provider.sybilRisk,
      triggerEvent: eventType,
    },
  });

  return result;
}

// ─── Metric Recomputation ─────────────────────────────────────────────────────

interface RecomputedMetrics {
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  defaultedJobs: number;
  disputedJobs: number;
  completionRate: number;
  repaymentRate: number;
  successfulEscrowRate: number;
  disputeRate: number;
  stakeRatio: number;
  scoreVolatility: number;
  recentFailureSignal: number;
  totalEconomicVolume: number;
}

/**
 * Recompute all derived metrics from actual job/event data.
 * This ensures metrics are always grounded in reality, not accumulated errors.
 */
async function recomputeMetrics(providerId: string): Promise<RecomputedMetrics> {
  const provider = await prisma.provider.findUnique({ where: { id: providerId } });
  if (!provider) {
    return {
      totalJobs: 0, successfulJobs: 0, failedJobs: 0, defaultedJobs: 0, disputedJobs: 0,
      completionRate: 1, repaymentRate: 1, successfulEscrowRate: 1, disputeRate: 0,
      stakeRatio: 0, scoreVolatility: 0, recentFailureSignal: 0, totalEconomicVolume: 0,
    };
  }

  // Count job outcomes from actual job records
  const jobs = await prisma.job.findMany({
    where: { providerId },
    select: { status: true, priceSats: true, escrowStatus: true, input: true },
  });

  const totalJobs = jobs.length;
  const successfulJobs = jobs.filter((j) => j.status === "completed").length;
  const failedJobs = jobs.filter((j) => j.status === "failed").length;

  // Escrow metrics
  const escrowJobs = jobs.filter((j) => j.escrowStatus !== "none");
  const releasedEscrows = escrowJobs.filter((j) => j.escrowStatus === "released").length;

  // Count from EconomicEvent for events not tracked in Job
  // Validated events: only count events tied to real jobs
  const defaultEvents = await prisma.economicEvent.count({
    where: { providerId, eventType: "DEFAULT", jobId: { not: null } },
  });
  const disputeEvents = await prisma.economicEvent.count({
    where: { providerId, eventType: "DISPUTE", jobId: { not: null } },
  });

  const defaultedJobs = defaultEvents;
  const disputedJobs = disputeEvents;

  // Total economic volume
  const totalEconomicVolume = jobs.reduce((sum, j) => sum + j.priceSats, 0);

  // Derived rates
  const completionRate = totalJobs > 0 ? successfulJobs / totalJobs : 1.0;
  const repaymentRate = totalJobs > 0 ? 1.0 - (defaultedJobs / totalJobs) : 1.0;
  const successfulEscrowRate = escrowJobs.length > 0
    ? releasedEscrows / escrowJobs.length : 1.0;
  const disputeRate = totalJobs > 0 ? disputedJobs / totalJobs : 0.0;
  const recentFailureSignal = computeRecentFailureSignal(jobs);

  // Stake ratio
  const stakeRatio = totalEconomicVolume > 0
    ? Math.min(provider.stakeSats / totalEconomicVolume, 1.0)
    : (provider.stakeSats > 0 ? 0.5 : 0.0);

  return {
    totalJobs,
    successfulJobs,
    failedJobs,
    defaultedJobs,
    disputedJobs,
    completionRate: round4(completionRate),
    repaymentRate: round4(repaymentRate),
    successfulEscrowRate: round4(successfulEscrowRate),
    disputeRate: round4(disputeRate),
    stakeRatio: round4(stakeRatio),
    scoreVolatility: 0, // Will be computed from score history
    recentFailureSignal: round4(recentFailureSignal),
    totalEconomicVolume,
  };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Compute the rolling standard deviation of recent scores including the new one.
 */
function computeVolatility(recentScores: number[], newScore: number): number {
  const scores = [...recentScores, newScore];
  if (scores.length < 2) return 0;

  const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
  const variance = scores.reduce((s, v) => s + (v - mean) ** 2, 0) / scores.length;
  return round4(Math.sqrt(variance));
}

function computeRecentFailureSignal(jobs: Array<{ status: string; input: string }>): number {
  const roundJobs = jobs
    .map((job) => ({ status: job.status, round: readSimRound(job.input) }))
    .filter((job): job is { status: string; round: number } => job.round !== null);

  if (roundJobs.length === 0) return 0;

  const latestRound = Math.max(...roundJobs.map((job) => job.round));
  let weightedFailures = 0;
  let weightedTotal = 0;

  for (const job of roundJobs) {
    const age = latestRound - job.round;
    if (age < 0 || age >= RECENT_FAILURE.windowRounds) continue;

    const weight = Math.max(0, 1 - age * RECENT_FAILURE.decayPerRound);
    weightedTotal += weight;
    if (job.status === "failed") {
      weightedFailures += weight;
    }
  }

  return weightedTotal > 0 ? Math.min(weightedFailures / weightedTotal, 1.0) : 0;
}

function readSimRound(input: string): number | null {
  try {
    const parsed = JSON.parse(input) as { round?: unknown };
    return typeof parsed.round === "number" ? parsed.round : null;
  } catch {
    return null;
  }
}
