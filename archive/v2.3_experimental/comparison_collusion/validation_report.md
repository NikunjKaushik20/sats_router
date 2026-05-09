# TRACE v2.1 vs v2.2 vs v2.3 — Validation Report

Generated: 2026-05-09T11:08:29.994Z
Seeds: 20 | Scales: 50 | Attacks: collusion-ring
Versions: v2.1, v2.2, v2.3

## collusion-ring | N=50

| Metric | v2.1 | v2.2 | v2.3 |
|--------|------|------|------|
| Success Rate | 0.9 ± 0 | 0.9 ± 0 | 0.9 ± 0 |
| Fraud (sats) | 36.9 ± 22.8 | 39 ± 24.2 | 45 ± 30.8 |
| Mal. Routing | 0.2 ± 0.1 | 0.2 ± 0.1 | 0.2 ± 0.1 |
| Recovery (rds) | 0.3 ± 0.7 | 0.5 ± 0.8 | 0.4 ± 0.9 |
| Concentration | 0.1 ± 0 | 0.1 ± 0 | 0.1 ± 0 |

### Pairwise Statistical Tests

| Comparison | Metric | Δ (mean) | p-value | Cliff's δ | Verdict |
|------------|--------|----------|---------|-----------|---------|
| v2.1→v2.2 | Success Rate | +0.00 | 0.6750 | -0.077 (negligible) | ➖ ns |
| v2.1→v2.2 | Fraud (sats) | +2.15 | 0.8817 | -0.028 (negligible) | ➖ ns |
| v2.1→v2.2 | Mal. Routing | +0.03 | 0.6456 | -0.085 (negligible) | ➖ ns |
| v2.1→v2.2 | Recovery (rds) | +0.15 | 0.5792 | -0.102 (negligible) | ➖ ns |
| v2.1→v2.2 | Concentration | +0.00 | 0.6359 | -0.087 (negligible) | ➖ ns |
| v2.1→v2.3 | Success Rate | +0.00 | 0.6168 | 0.092 (negligible) | ➖ ns |
| v2.1→v2.3 | Fraud (sats) | +8.10 | 0.4094 | -0.152 (small) | ➖ ns |
| v2.1→v2.3 | Mal. Routing | +0.03 | 0.5428 | -0.113 (negligible) | ➖ ns |
| v2.1→v2.3 | Recovery (rds) | +0.10 | 0.7868 | -0.050 (negligible) | ➖ ns |
| v2.1→v2.3 | Concentration | +0.00 | 0.0834 | -0.320 (small) | ➖ ns |
| v2.2→v2.3 | Success Rate | +0.00 | 0.3867 | 0.160 (small) | ➖ ns |
| v2.2→v2.3 | Fraud (sats) | +5.95 | 0.6949 | -0.072 (negligible) | ➖ ns |
| v2.2→v2.3 | Mal. Routing | +0.00 | 0.9676 | -0.007 (negligible) | ➖ ns |
| v2.2→v2.3 | Recovery (rds) | -0.05 | 0.7660 | 0.055 (negligible) | ➖ ns |
| v2.2→v2.3 | Concentration | +0.00 | 0.2733 | -0.203 (small) | ➖ ns |

### Stability Analysis

| Metric | v2.1 σ | v2.2 σ | v2.3 σ | Best |
|--------|------|------|------|------|
| Fraud σ | 22.84 | 24.21 | 30.82 | **v2.1** |
| Routing σ | 0.1200 | 0.1300 | 0.1200 | **v2.1** |

### Catastrophic Outlier Analysis

| Version | Catastrophic Seeds | Rate | IQR Outliers |
|---------|-------------------|------|-------------|
| v2.1 | 1/20 (5%) | >74 sats | 0 |
| v2.2 | 1/20 (5%) | >88 sats | 0 |
| v2.3 | 2/20 (10%) | >98 sats | 2 |

### Honest Routing Analysis

| Metric | v2.1 | v2.2 | v2.3 |
|--------|------|------|------|
| Honest Routing Mean | 82.0% | 79.0% | 79.0% |
| Honest Routing σ | 12.00% | 13.00% | 12.00% |

---

## Decision Gate — Best Version Selection

| Version | Wins | Total Criteria | Win Rate |
|---------|------|----------------|----------|
| **v2.1** | 4 | 4 | **100%** |
| **v2.2** | 0 | 4 | **0%** |
| **v2.3** | 0 | 4 | **0%** |

### Win Breakdown

**v2.1** (4 wins):
  - collusion-ring/N=50: lowest fraud
  - collusion-ring/N=50: lowest variance
  - collusion-ring/N=50: best honest routing
  - collusion-ring/N=50: fewest catastrophic seeds

**v2.2** (0 wins):
  - (none)

**v2.3** (0 wins):
  - (none)

> **RECOMMENDED PAPER SYSTEM: v2.1** — Won 4/4 criteria across all conditions.
