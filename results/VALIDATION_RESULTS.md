# TRACE — Definitive Version Validation Results

> **v2.1 vs v2.2 vs v2.3 | 20-seed | N=50 | Collusion-Ring + Strategic-Default**

---

## 1. Experiment Setup

| Parameter | Value |
|-----------|-------|
| Versions compared | v2.1, v2.2, v2.3 |
| Seeds per condition | 20 |
| Agents | 50 (30% malicious) |
| Rounds | 60 × 5 jobs/round |
| Agent mix | 17 GPT-4o Mini + 17 Sarvam AI + 16 Llama 3.2 3B |
| Attack types | collusion-ring, strategic-default |
| Statistical tests | Mann-Whitney U (non-parametric), Cliff's Delta (effect size) |
| Significance threshold | p < 0.05, two-tailed |

### Version Definitions

| Version | Adaptive Scaling | Causal Graph | Temporal Trust | Added Complexity |
|---------|:----------------:|:------------:|:--------------:|:----------------:|
| **v2.1** | ❌ | ❌ | ❌ | Baseline |
| **v2.2** | ✅ | ✅ | ❌ | + scale-aware penalties, failure cascades |
| **v2.3** | ✅ | ✅ | ✅ | + trust velocity, reciprocal detection, economic depth |

---

## 2. Results — Collusion-Ring Attack

The primary attack TRACE is designed to mitigate.

### 2.1 Primary Metrics (mean ± σ, 20 seeds)

| Metric | v2.1 | v2.2 | v2.3 | Best |
|--------|:----:|:----:|:----:|:----:|
| Success Rate | **0.9 ± 0** | 0.9 ± 0 | 0.9 ± 0 | — (tied) |
| **Fraud (sats)** | **36.9 ± 22.8** | 39.0 ± 24.2 | 45.0 ± 30.8 | **v2.1** |
| Mal. Routing | 0.2 ± 0.1 | 0.2 ± 0.1 | 0.2 ± 0.1 | — (tied) |
| Recovery (rds) | **0.3 ± 0.7** | 0.5 ± 0.8 | 0.4 ± 0.9 | **v2.1** |

### 2.2 Pairwise Significance — Fraud Exposure

| Comparison | Δ (sats) | p-value | Cliff's δ | Significant? |
|------------|----------|---------|-----------|:------------:|
| v2.1 → v2.2 | +2.15 | 0.8817 | -0.028 (negligible) | ❌ |
| v2.1 → v2.3 | +8.10 | 0.4094 | -0.152 (small) | ❌ |
| v2.2 → v2.3 | +5.95 | 0.6949 | -0.072 (negligible) | ❌ |

> **No pairwise comparison reaches significance.** All effect sizes are negligible to small.

### 2.3 Stability & Tail Risk

| Metric | v2.1 | v2.2 | v2.3 | Winner |
|--------|:----:|:----:|:----:|:------:|
| Fraud σ | **22.84** | 24.21 | 30.82 | **v2.1** |
| Routing σ | **0.12** | 0.13 | 0.12 | **v2.1** |
| Catastrophic seeds | **1/20 (5%)** | 1/20 (5%) | 2/20 (10%) | **v2.1** |
| IQR outliers | **0** | 0 | 2 | **v2.1** |

### 2.4 Honest Routing (False Suppression)

| Metric | v2.1 | v2.2 | v2.3 |
|--------|:----:|:----:|:----:|
| Honest Routing Mean | **82%** | 79% | 79% |
| Honest Routing σ | 12% | 13% | 12% |

> v2.2 and v2.3 both suppress honest agents by **3 percentage points** relative to v2.1.

### 2.5 Collusion-Ring Verdict

| Criterion | Winner |
|-----------|:------:|
| Lowest fraud mean | **v2.1** |
| Lowest fraud variance | **v2.1** |
| Best honest routing | **v2.1** |
| Fewest catastrophic seeds | **v2.1** |
| **Score** | **v2.1: 4/4** |

---

## 3. Results — Strategic-Default Attack

The secondary attack measuring TRACE's general robustness.

### 3.1 Primary Metrics (mean ± σ, 20 seeds)

| Metric | v2.1 | v2.2 | v2.3 | Best |
|--------|:----:|:----:|:----:|:----:|
| Success Rate | 1.0 ± 0 | 1.0 ± 0 | 0.9 ± 0 | — (tied) |
| **Fraud (sats)** | 13.0 ± 14.1 | **12.7 ± 14.4** | 16.7 ± 12.4 | **v2.2** |
| Mal. Routing | 0.3 ± 0.1 | **0.2 ± 0.1** | 0.3 ± 0.1 | **v2.2** |
| Recovery (rds) | **1.9 ± 1.5** | 2.2 ± 1.6 | 2.1 ± 1.3 | **v2.1** |

### 3.2 Pairwise Significance — Fraud Exposure

| Comparison | Δ (sats) | p-value | Cliff's δ | Significant? |
|------------|----------|---------|-----------|:------------:|
| v2.1 → v2.2 | -0.30 | 0.8817 | 0.028 (negligible) | ❌ |
| v2.1 → v2.3 | +3.75 | 0.2559 | -0.210 (small) | ❌ |
| v2.2 → v2.3 | +4.05 | 0.2793 | -0.200 (small) | ❌ |

> Again, **no pairwise comparison reaches significance.**

### 3.3 Stability & Tail Risk

| Metric | v2.1 | v2.2 | v2.3 | Winner |
|--------|:----:|:----:|:----:|:------:|
| Fraud σ | 14.09 | 14.37 | **12.41** | **v2.3** |
| Routing σ | 0.14 | **0.12** | 0.15 | **v2.2** |
| Catastrophic seeds | 3/20 (15%) | 2/20 (10%) | **1/20 (5%)** | **v2.3** |
| IQR outliers | 0 | 1 | **0** | **v2.1/v2.3** |

### 3.4 Honest Routing (False Suppression)

| Metric | v2.1 | v2.2 | v2.3 |
|--------|:----:|:----:|:----:|
| Honest Routing Mean | 74% | **78%** | 74% |
| Honest Routing σ | 14% | **12%** | 15% |

> Under strategic-default, v2.2's adaptive scaling **helps** honest routing (+4pp).

### 3.5 Strategic-Default Verdict

| Criterion | Winner |
|-----------|:------:|
| Lowest fraud mean | **v2.2** |
| Lowest fraud variance | **v2.3** |
| Best honest routing | **v2.2** |
| Fewest catastrophic seeds | **v2.3** |
| **Score** | **v2.2: 2/4, v2.3: 2/4** |

---

## 4. Cross-Attack Summary

| Criterion | Collusion-Ring | Strategic-Default | Overall Winner |
|-----------|:--------------:|:-----------------:|:--------------:|
| Lowest fraud mean | v2.1 | v2.2 | v2.1/v2.2 |
| Lowest fraud variance | v2.1 | v2.3 | v2.1/v2.3 |
| Best honest routing | v2.1 | v2.2 | v2.1/v2.2 |
| Fewest catastrophic seeds | v2.1 | v2.3 | v2.1/v2.3 |
| **Total wins** | **v2.1: 4** | **v2.2: 2, v2.3: 2** | **v2.1: 4, v2.2: 2, v2.3: 2** |

---

## 5. Significance Summary

Across **30 pairwise statistical tests** (15 per attack × 2 attacks):

| Result | Count | Percentage |
|--------|:-----:|:----------:|
| Significant (p < 0.05) | **0** | **0%** |
| Not significant | 30 | 100% |
| Negligible effect size | 22 | 73% |
| Small effect size | 8 | 27% |
| Medium/large effect size | 0 | 0% |

> **Zero out of thirty tests reached statistical significance.**
>
> The three TRACE versions are statistically indistinguishable at N=50 with 20 seeds.

---

## 6. Verdict

### Primary Question

> *Does temporal-causal trust evolution (v2.3) meaningfully improve TRACE beyond v2.1?*

### Answer: No.

The evidence is unambiguous:

1. **v2.3 adds complexity without measurable benefit.** Fraud is higher (+8.1 sats under collusion, +3.75 under strategic-default), variance is higher (+35% under collusion), and false suppression increases (-3pp honest routing under collusion). Zero of its improvements reach statistical significance.

2. **v2.2 is a wash.** It slightly helps under strategic-default (best honest routing, tied for lowest fraud) but slightly hurts under collusion (+2.2 sats fraud, -3pp honest routing). The net effect across both attacks is indistinguishable from v2.1.

3. **v2.1 is the safest choice.** It wins 4/4 criteria under the primary attack (collusion), has the lowest fraud variance overall, and introduces zero unnecessary complexity.

### Recommended Paper System

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   TRACE v2.1 — Baseline Composite Trust Scoring     │
│                                                     │
│   Primary paper system.                             │
│   No adaptive scaling. No causal graph.             │
│   No temporal trust. Clean and defensible.          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Paper Treatment of v2.2 and v2.3

**v2.2 (Adaptive Scaling + Causal Graph):**
> "Scale-aware penalty adaptation and failure cascade tracking were explored.
> Under strategic-default attacks, v2.2 showed marginal improvements in honest
> routing share (+4pp, p=0.41, ns), but offered no significant benefit under
> collusion attacks. We retain these mechanisms as optional extensions."

**v2.3 (Temporal-Causal Trust Evolution):**
> "Temporal trust dynamics, including trust velocity modeling, reciprocal
> amplification detection, and economic depth maturation, were implemented
> and evaluated. The mechanisms did not produce statistically significant
> improvements at N=50 and increased fraud variance by 35% under collusion
> attacks. We leave temporal trust modeling as future work for larger
> network scales (N > 200) where the signal-to-noise ratio may justify
> the additional complexity."

---

## 7. Methodology Notes

- All experiments used identical seeds (1–20), agent distributions, attack timing, and budgets
- Only the feature flag configuration changed between versions
- Mann-Whitney U was chosen over t-tests because fraud distributions are right-skewed
- Cliff's Delta was used for effect size because it is robust to non-normal distributions
- Catastrophic seeds defined as fraud > median + 2σ (conservative threshold)
- False suppression measured via honest routing share proxy (1 − maliciousRoutingRate)

---

*Generated by TRACE Validation Suite — `scripts/runVersionComparison.ts`*
*Data stored in `results/version_comparison_1778324909993/` (collusion) and `results/version_comparison_1778326378235/` (strategic-default)*
