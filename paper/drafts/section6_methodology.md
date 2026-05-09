# TRACE Paper — Section 6: Methodology & Statistical Rigor
# Draft v1 — 2026-05-09

---

## 6. Methodology

### Multi-Seed Evaluation

All results reported in this paper are averaged across 20 independent random seeds (seeds 1–20). Each seed controls the random number generator state for agent initialization, job arrival ordering, and attack timing. Single-seed results in adversarial multi-agent simulations are unreliable due to high variance in attack execution — a lucky seed can make a weak defense appear strong and vice versa.

We selected 20 seeds as the minimum count that provides adequate statistical power for Mann-Whitney U tests at our observed effect sizes. For the primary comparison (TRACE vs PRICE under collusion), actual effect sizes are large (Cliff's δ > 0.6), requiring only 8–10 seeds for 80% power. For the version comparison (v2.1 vs v2.3), all observed effects are negligible to small, confirming that 20 seeds was sufficient to detect any meaningful difference had one existed.

### Non-Parametric Statistics

We use Mann-Whitney U tests rather than t-tests for all significance testing. Fraud exposure distributions are right-skewed (long tail toward high-fraud outcomes), violating the normality assumption required for parametric tests. The Mann-Whitney U test makes no distributional assumption and is appropriate for our ordinal-level comparisons.

The significance threshold is α = 0.05 (two-tailed) with no multiple-comparison correction applied within the main results. For the version comparison analysis (30 simultaneous tests), the Bonferroni-corrected threshold would be p < 0.0017 — and all 30 p-values remain far above even this threshold (minimum p = 0.08), further confirming the null result.

### Effect Size Measurement

We report Cliff's Delta (δ) alongside p-values for all comparisons. Cliff's Delta measures the probability that a random value from group A exceeds a random value from group B, minus the reverse — a signed, bounded [-1, 1] measure of distributional separation. Interpretation thresholds follow Romano et al. [2006]:
- |δ| < 0.147: negligible
- 0.147 ≤ |δ| < 0.33: small
- 0.33 ≤ |δ| < 0.474: medium
- |δ| ≥ 0.474: large

Cliff's Delta is preferable to Cohen's d in our setting because it does not assume equal variances across groups — a property violated in our version comparisons where v2.3 exhibits substantially higher fraud variance than v2.1.

### Catastrophic Seed Analysis

We define a **catastrophic seed** as one where fraud exposure exceeds median + 2σ across the seed distribution. This tail-focused metric captures worst-case behavior that mean-only analysis would obscure. A system with low mean fraud but high catastrophic seed rate is less suitable for deployment than one with slightly higher mean but no catastrophic outliers.

This metric is particularly informative for the version comparison: v2.3 produces 2 catastrophic seeds (>98 sats threshold) versus 1 for v2.1 (>74 sats threshold) under identical conditions — a qualitative tail risk difference invisible in the mean comparison.

### False Suppression Measurement

False suppression — routing penalties incorrectly applied to honest agents — is measured via the **honest routing share proxy**: the fraction of routed jobs received by non-malicious agents (1 − malicious routing rate). This proxy underestimates true false suppression because some malicious agents may receive jobs through correct routing decisions (when they happen to be the best available option). However, it provides a consistent, interpretable lower bound on honest agent utilization across conditions.

A 3-percentage-point reduction in honest routing share (82% → 79%, v2.1 → v2.2/v2.3) represents approximately 9 additional jobs per 300 diverted away from honest agents per experiment — economically meaningful at scale.
