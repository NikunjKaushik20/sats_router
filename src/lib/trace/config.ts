/**
 * TRACE v2.1 Configuration — LOCKED FOR PAPER
 *
 * Validated 2026-05-09 via 120-experiment matrix (3 versions × 2 attacks × 20 seeds).
 * v2.1 won 4/4 criteria under collusion-ring: lowest fraud, lowest variance,
 * best honest routing, fewest catastrophic seeds.
 * See results/VALIDATION_RESULTS.md for full evidence.
 *
 * v2.1 features (ACTIVE):
 *   - Counterparty entropy diversity engine
 *   - Repeated-pair exponential suppression
 *   - Clique penalty for low-diversity patterns
 *   - Sybil-aware routing, trust saturation, progressive unlocking
 *
 * v2.2 extensions (DISABLED — enabled=false in adaptiveConfig.ts, causalGraph.ts):
 *   - Adaptive scale-aware penalty scaling
 *   - Confidence-gated entropy activation
 *   - Causal graph integration
 *
 * v2.3 extensions (DISABLED — enabled=false in temporalTrust.ts):
 *   - Trust velocity & acceleration modeling
 *   - Entropy trajectory analysis
 *   - Reciprocal amplification detection
 *   - Economic trust maturation
 */

// ─── TRACE Score Weights ──────────────────────────────────────────────────────
// v2: increased sybilRisk weight (0.15 → 0.25) and defaultProbability (0.20 → 0.30)
export const TRACE_WEIGHTS = {
  w1_completionRate:       0.25,
  w2_repaymentRate:        0.20,
  w3_networkTrust:         0.10,  // v2: reduced from 0.15 (trust graph is exploitable)
  w4_stakeRatio:           0.10,
  w5_successfulEscrowRate: 0.15,
  w6_defaultProbability:   0.30,  // v2: increased from 0.20 (steeper penalty)
  w7_sybilRisk:            0.25,  // v2: increased from 0.15 (sybil is critical)
  w8_disputeRate:          0.10,
} as const;

// Base score: new providers start at 500/1000
export const TRACE_BASE_SCORE = 500;
export const TRACE_MAX_SCORE = 1000;
export const TRACE_MIN_SCORE = 0;

// ─── Risk Tiering ─────────────────────────────────────────────────────────────
export const RISK_TIERS = {
  A: { min: 850, max: 1000, label: "A — Prime" },
  B: { min: 700, max: 849,  label: "B — Standard" },
  C: { min: 550, max: 699,  label: "C — Elevated Risk" },
  D: { min: 0,   max: 549,  label: "D — High Risk" },
} as const;

export type RiskTier = keyof typeof RISK_TIERS;

// ─── Default Probability Engine ───────────────────────────────────────────────
export const DEFAULT_PROB_WEIGHTS = {
  repaymentFailureWeight:  0.30,
  disputeWeight:           0.20,
  recentInstabilityWeight: 0.25,  // v2: increased from 0.20 (recent failures hit harder)
  stakePenaltyWeight:      0.10,
  historyWeight:           0.15,  // v2: increased from 0.10 (deeper history matters more)
} as const;

// Recency window for "recent instability"
export const INSTABILITY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── v2: Recent Failure Amplification ─────────────────────────────────────────
export const RECENT_FAILURE = {
  windowRounds: 5,            // Look at last 5 rounds for failure clustering
  amplificationMultiplier: 2.5, // Recent defaults are 2.5× more impactful
  decayPerRound: 0.3,         // Each round reduces the amplification
} as const;

// ─── Routing Utility ──────────────────────────────────────────────────────────
// v2.1: U = α·TRACE − β·defaultRisk − γ·cost
//         + δ·(adjustedTrust)                   ← diversity-weighted
//         − λ·sybilRisk                         ← DIRECT PENALTY
//         − μ·cliquePenalty                     ← v2.1: collusion penalty
//         + ε·capabilityMatch
export const ROUTING_UTILITY = {
  alpha_traceScore:     0.40,
  beta_defaultRisk:     0.30,
  gamma_cost:           0.15,
  delta_networkTrust:   0.10,
  epsilon_capability:   0.10,
  lambda_sybilPenalty:  0.20,
  mu_cliquePenalty:     0.15,  // v2.1: NEW — penalizes low-diversity economic patterns
} as const;

export type TraceRoutingPreset = "baseline" | "guard_mid" | "guard_cost" | "guard_safe" | "guard_whitewash";
export type RoutingUtilityConfig = Record<keyof typeof ROUTING_UTILITY, number> & {
  minJobsForFullAccess?: number;
  volatilityPenaltyWeight?: number;
};

export const TRACE_ROUTING_PRESETS: Record<TraceRoutingPreset, RoutingUtilityConfig> = {
  baseline: {
    alpha_traceScore:     0.40,
    beta_defaultRisk:     0.30,
    gamma_cost:           0.15,
    delta_networkTrust:   0.10,
    epsilon_capability:   0.10,
    lambda_sybilPenalty:  0.20,
    mu_cliquePenalty:     0.15,
  },
  guard_mid: {
    alpha_traceScore:     0.46,   // v2.4: +0.02 to compensate for delta reduction
    beta_defaultRisk:     0.42,
    gamma_cost:           0.10,
    delta_networkTrust:   0.04,   // v2.4: 0.10→0.04 — limits collusion-ring's fake-trust routing boost
    epsilon_capability:   0.10,
    lambda_sybilPenalty:  0.38,
    mu_cliquePenalty:     0.20,
    minJobsForFullAccess: 15,
  },
  guard_cost: {
    alpha_traceScore:     0.42,
    beta_defaultRisk:     0.44,
    gamma_cost:           0.07,
    delta_networkTrust:   0.10,
    epsilon_capability:   0.10,
    lambda_sybilPenalty:  0.40,
    mu_cliquePenalty:     0.20,
    minJobsForFullAccess: 15,
  },
  guard_safe: {
    alpha_traceScore:     0.36,
    beta_defaultRisk:     0.60,
    gamma_cost:           0.18,
    delta_networkTrust:   0.06,
    epsilon_capability:   0.08,
    lambda_sybilPenalty:  0.70,
    mu_cliquePenalty:     0.30,
  },
  guard_whitewash: {
    alpha_traceScore:     0.46,
    beta_defaultRisk:     0.50,
    gamma_cost:           0.08,
    delta_networkTrust:   0.08,
    epsilon_capability:   0.08,
    lambda_sybilPenalty:  0.42,
    mu_cliquePenalty:     0.25,
    minJobsForFullAccess: 15,
    volatilityPenaltyWeight: 0.25,
  },
};

export function applyTraceRoutingPreset(preset: TraceRoutingPreset = "baseline"): void {
  const p = TRACE_ROUTING_PRESETS[preset];
  const utilityKeys = ["alpha_traceScore", "beta_defaultRisk", "gamma_cost", "delta_networkTrust", "epsilon_capability", "lambda_sybilPenalty", "mu_cliquePenalty"];
  const utilConfig: any = {};
  for (const k of utilityKeys) utilConfig[k] = (p as any)[k];
  Object.assign(ROUTING_UTILITY as Record<string, number>, utilConfig);

  // Apply optional guard overrides
  if (p.minJobsForFullAccess !== undefined) {
    (PROGRESSIVE_TRUST as any).minJobsForFullAccess = p.minJobsForFullAccess;
  } else {
    (PROGRESSIVE_TRUST as any).minJobsForFullAccess = 10; // reset to default
  }
  
  if (p.volatilityPenaltyWeight !== undefined) {
    (VOLATILITY as any).volatilityPenaltyWeight = p.volatilityPenaltyWeight;
  } else {
    (VOLATILITY as any).volatilityPenaltyWeight = 0.15; // reset to default
  }
}

// ─── Routing Constraints ──────────────────────────────────────────────────────
export const ROUTING_CONSTRAINTS = {
  minTraceScore:        300,
  maxDefaultProbability: 0.6,  // v2: tightened from 0.7
  maxSybilRisk:         0.6,   // v2: tightened from 0.8 — CRITICAL for sybil hardening
  maxActiveDisputes:    3,
} as const;

// Controlled exploration for experiments: lets low-exposure providers receive
// occasional routed jobs so adversarial adaptivity is actually exercised.
// v2.4: Halved epsilon (0.08→0.04, 0.02→0.01) — reduces random re-routing to
//       already-penalised malicious agents after TRACE detects the attack.
export const EXPLORATION_CONFIG = {
  epsilonStart: 0.04,
  epsilonEnd: 0.01,
  decayRounds: 60,
  minExplorationCandidates: 10,
} as const;

// ─── Cold Start / Progressive Trust ──────────────────────────────────────────
export const COLD_START = {
  maxJobsForBonus:      5,
  explorationBonus:     30,    // v2: reduced from 50 (less free trust for new agents)
  maxExposureSats:      30,    // v2: reduced from 50 (tighter exposure caps)
} as const;

// v2: Progressive Trust Unlocking — limits how much routing a new agent gets
export const PROGRESSIVE_TRUST = {
  minJobsForFullAccess: 10,    // Must complete 10 jobs before full routing access
  accessScalePerJob:    0.10,  // Each job unlocks 10% more routing access
  stakeBoostMultiplier: 1.5,   // Staked agents unlock 50% faster
} as const;

// ─── Score Update Deltas ──────────────────────────────────────────────────────
// v2: steeper penalties for defaults and failures
export const SCORE_DELTAS = {
  JOB_SUCCESS:      +30,
  JOB_FAILURE:      -50,       // v2: steeper from -40
  ESCROW_RELEASED:  +20,
  ESCROW_REFUNDED:  -30,       // v2: steeper from -25
  DISPUTE:          -60,       // v2: steeper from -50
  DEFAULT:          -100,      // v2: steeper from -80
  STAKE_ADDED:      +15,
  STAKE_SLASHED:    -80,       // v2: steeper from -60
  PAYMENT_SETTLED:  +10,
  HUMAN_VERIFIED:   +5,
} as const;

// ─── v2/v2.1: Trust Graph Validation ──────────────────────────────────────────
export const TRUST_GRAPH_VALIDATION = {
  // Trust saturation cap: networkTrust cannot exceed this via any mechanism
  maxNetworkTrust: 0.8,

  // Edge diversity: minimum unique counterparties for full trust benefit
  minDiverseEdges: 3,

  // Same-cluster suppression: reduce trust gain when interactions are within a dense cluster
  clusterInteractionPenalty: 0.5,

  // Circular trust detection: A→B→C→A patterns
  circularPenaltyPerCycle: 0.15,
  maxCircularPenalty: 0.6,

  // Edge weight saturation: diminishing returns on repeated interactions
  edgeWeightCap: 5.0,
} as const;

// ─── v2.1: Counterparty Diversity Engine ──────────────────────────────────────
export const COUNTERPARTY_DIVERSITY = {
  // Entropy: H = -Σ pᵢ·log₂(pᵢ) — higher = more diverse
  // For N equally distributed counterparties: H = log₂(N)
  // 2 counterparties max entropy: 1.0, 4: 2.0, 8: 3.0
  minEntropyForFullTrust: 1.5,    // ~3 diverse counterparties needed for full trust
  entropyPenaltyWeight: 0.3,      // How much low entropy dampens trust

  // diversityScore = clamp(entropy / minEntropyForFullTrust, 0, 1)
  // AdjustedTrust = networkTrust × diversityScore
} as const;

/** Simulation: retain only the last N rounds of co-job interactions for entropy (scales to large N). */
export const INTERACTION_HISTORY_WINDOW = {
  maxRounds: 200,
} as const;

// ─── v2.1: Repeated-Pair Suppression ──────────────────────────────────────────
export const REPEATED_PAIR = {
  // Trust gain decays exponentially with repeated interactions:
  //   trustGain *= exp(-interactionCount / decayConstant)
  decayConstant: 3.0,            // After 3 interactions, gain is ~37% of original
                                  // After 6 interactions, gain is ~14%
                                  // After 9 interactions, gain is ~5%

  // Maximum trust contribution from any single counterparty pair
  maxSinglePairContribution: 0.15, // No single pair can contribute > 15% of total trust
} as const;

// ─── v2.1: Economic Volume Weighting ──────────────────────────────────────────
export const ECONOMIC_VOLUME_WEIGHTING = {
  // Minimum volume for full trust gain (below this, trust gain is dampened)
  minVolumeForFullWeight: 20,     // 20 sats minimum for meaningful trust

  // Trust gain multiplier: log₂(1 + volume / minVolume) capped at 1.0
  // This means tiny fake transactions (1-5 sats) contribute very little trust
} as const;

// ─── v2: Economic Event Validation ────────────────────────────────────────────
export const EVENT_VALIDATION = {
  // Require job existence for trust-affecting events
  requireJobForTrustUpdate: true,

  // Suppress duplicate events within this window
  deduplicationWindowMs: 5000, // 5 seconds

  // Event authenticity weighting: scale trust gains by event quality
  weightByPaymentSize: true,   // Larger payments = more trust contribution
  weightByDiversity: true,     // Diverse counterparties = more trust
  maxEventsPerProviderPerRound: 10, // Anti-spam: cap events per round
} as const;

// ─── Temporal Trust Decay ─────────────────────────────────────────────────────
export const TRUST_DECAY = {
  halfLifeMs: 5 * 24 * 60 * 60 * 1000, // v2: 5 days (was 7) — faster decay
  inactivityPenaltyMs: 3 * 24 * 60 * 60 * 1000, // v2: NEW — 3 days without activity → penalty
  inactivityPenaltyRate: 0.1, // 10% trust reduction per inactivity period
} as const;

// ─── v2: Volatility Penalties ─────────────────────────────────────────────────
export const VOLATILITY = {
  // Highly volatile providers lose routing priority
  maxAcceptableVolatility: 80,  // Score stddev
  volatilityPenaltyWeight: 0.15, // Applied to utility function
} as const;

// ─── Experiment Registry ──────────────────────────────────────────────────────
export type RoutingPolicy = "TRACE" | "REPUTATION" | "PRICE" | "STAKE_WEIGHTED";

/**
 * Snapshot the entire v2 config for experiment reproducibility.
 */
export function snapshotConfig() {
  /* eslint-disable @typescript-eslint/no-require-imports -- runtime require breaks import cycle (adaptiveConfig → config). */
  const { ADAPTIVE_SCALING } = require("./adaptiveConfig");
  const { CAUSAL_CONFIG } = require("./causalGraph");
  const { TEMPORAL_CONFIG } = require("./temporalTrust");
  /* eslint-enable @typescript-eslint/no-require-imports */

  return {
    version: "v2.1",
    traceWeights: { ...TRACE_WEIGHTS },
    riskTiers: { ...RISK_TIERS },
    defaultProbWeights: { ...DEFAULT_PROB_WEIGHTS },
    recentFailure: { ...RECENT_FAILURE },
    routingUtility: { ...ROUTING_UTILITY },
    traceRoutingPresets: { ...TRACE_ROUTING_PRESETS },
    routingConstraints: { ...ROUTING_CONSTRAINTS },
    explorationConfig: { ...EXPLORATION_CONFIG },
    coldStart: { ...COLD_START },
    progressiveTrust: { ...PROGRESSIVE_TRUST },
    scoreDeltas: { ...SCORE_DELTAS },
    trustGraphValidation: { ...TRUST_GRAPH_VALIDATION },
    counterpartyDiversity: { ...COUNTERPARTY_DIVERSITY },
    repeatedPair: { ...REPEATED_PAIR },
    economicVolumeWeighting: { ...ECONOMIC_VOLUME_WEIGHTING },
    eventValidation: { ...EVENT_VALIDATION },
    trustDecay: { ...TRUST_DECAY },
    volatility: { ...VOLATILITY },
    adaptiveScaling: { ...ADAPTIVE_SCALING },
    causalConfig: { ...CAUSAL_CONFIG },
    temporalConfig: { ...TEMPORAL_CONFIG },
    snapshotAt: new Date().toISOString(),
  };
}
