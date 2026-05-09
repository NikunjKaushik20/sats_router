/**
 * TRACE v2.2 — Adaptive Scale-Aware Configuration
 *
 * Computes effective parameter values based on network scale,
 * interaction maturity, and confidence levels.
 *
 * Core principle: static parameters overreact at small scales.
 * Adaptive scaling produces stable behavior across N=30 → N=100.
 *
 * μ_effective = μ × min(1, N / N_target)
 * confidence  = min(1, interactionCount / K)
 */

import { ROUTING_UTILITY, COUNTERPARTY_DIVERSITY, REPEATED_PAIR } from "./config";

// ─── Adaptive Scaling Constants ───────────────────────────────────────────────

export const ADAPTIVE_SCALING = {
  /** Target scale where penalties reach full strength */
  targetScale: 100,

  /** Minimum scale factor — even at N=1, penalty is at least this fraction */
  minPenaltyScale: 0.3,

  /** Minimum interactions before entropy estimates are trusted */
  entropyConfidenceK: 15,

  /** Minimum interactions before repeated-pair decay activates fully */
  decayMaturityK: 10,

  /** Enable/disable adaptive scaling (for ablation testing)
   *  LOCKED TO FALSE — v2.1 validated as paper system (2026-05-09)
   *  See results/VALIDATION_RESULTS.md for evidence */
  enabled: false,
} as const;

// ─── Scale-Aware Penalty Computation ──────────────────────────────────────────

/**
 * Compute scale factor for penalties.
 *
 *   scaleFactor = max(minPenaltyScale, min(1, N / N_target))
 *
 * At N=30:  0.30 → weak
 * At N=50:  0.50 → moderate
 * At N=100: 1.00 → full strength
 */
export function computeScaleFactor(networkSize: number): number {
  if (!ADAPTIVE_SCALING.enabled) return 1.0;

  const raw = networkSize / ADAPTIVE_SCALING.targetScale;
  return Math.max(ADAPTIVE_SCALING.minPenaltyScale, Math.min(1.0, raw));
}

/**
 * Compute effective clique penalty for the current network scale.
 *
 *   μ_effective = μ × scaleFactor
 */
export function effectiveCliquePenalty(networkSize: number): number {
  const scaleFactor = computeScaleFactor(networkSize);
  return (ROUTING_UTILITY as any).mu_cliquePenalty * scaleFactor;
}

/**
 * Compute effective sybil penalty for the current network scale.
 *
 *   λ_effective = λ × scaleFactor
 */
export function effectiveSybilPenalty(networkSize: number): number {
  const scaleFactor = computeScaleFactor(networkSize);
  return (ROUTING_UTILITY as any).lambda_sybilPenalty * scaleFactor;
}

// ─── Confidence-Gated Entropy ─────────────────────────────────────────────────

/**
 * Compute interaction confidence factor.
 *
 *   confidence = min(1, interactionCount / K)
 *
 * Agents with few interactions get reduced entropy penalty — they haven't
 * had the chance to build diversity yet.
 */
export function computeEntropyConfidence(totalInteractions: number): number {
  if (!ADAPTIVE_SCALING.enabled) return 1.0;

  return Math.min(1.0, totalInteractions / ADAPTIVE_SCALING.entropyConfidenceK);
}

/**
 * Compute confidence-weighted entropy penalty.
 *
 *   effectivePenalty = confidence × rawPenalty
 *
 * This means:
 *   - 0 interactions: no entropy penalty
 *   - 7 interactions: ~47% of full penalty
 *   - 15+ interactions: full entropy penalty
 */
export function confidenceWeightedEntropyPenalty(
  rawEntropyPenalty: number,
  totalInteractions: number
): number {
  const confidence = computeEntropyConfidence(totalInteractions);
  return confidence * rawEntropyPenalty;
}

// ─── Maturity-Aware Decay ─────────────────────────────────────────────────────

/**
 * Compute maturity factor for repeated-pair decay.
 *
 * At small scales / low maturity, the decay constant is stretched
 * (more lenient), preventing over-penalization of legitimate
 * concentrated interactions that happen naturally in small networks.
 *
 *   maturityFactor ∈ [0.5, 1.5]
 *     - Small network, low diversity: 1.5 (slower decay, more lenient)
 *     - Large network, high diversity: 0.5 (faster decay, stricter)
 *     - Default: 1.0
 */
export function computeMaturityFactor(
  networkSize: number,
  diversityScore: number
): number {
  if (!ADAPTIVE_SCALING.enabled) return 1.0;

  const scaleFactor = computeScaleFactor(networkSize);

  // Invert: small scale → higher maturity factor (more lenient)
  // High diversity → lower maturity factor (stricter — diverse agents don't need leniency)
  const rawMaturity = 1.5 - (scaleFactor * 0.5) - (diversityScore * 0.5);

  return Math.max(0.5, Math.min(1.5, rawMaturity));
}

/**
 * Compute effective repeated-pair decay constant.
 *
 *   k_effective = k × maturityFactor
 *
 * Higher k_effective = slower decay = more lenient
 */
export function effectiveDecayConstant(
  networkSize: number,
  diversityScore: number
): number {
  const maturity = computeMaturityFactor(networkSize, diversityScore);
  return REPEATED_PAIR.decayConstant * maturity;
}
