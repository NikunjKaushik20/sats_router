# TRACE v2.1 vs v2.2 vs v2.3 — Validation Report

Generated: 2026-05-09T11:32:58.236Z
Seeds: 20 | Scales: 50 | Attacks: strategic-default
Versions: v2.1, v2.2, v2.3

## strategic-default | N=50

| Metric | v2.1 | v2.2 | v2.3 |
|--------|------|------|------|
| Success Rate | 1 ± 0 | 1 ± 0 | 0.9 ± 0 |
| Fraud (sats) | 13 ± 14.1 | 12.7 ± 14.4 | 16.7 ± 12.4 |
| Mal. Routing | 0.3 ± 0.1 | 0.2 ± 0.1 | 0.3 ± 0.1 |
| Recovery (rds) | 1.9 ± 1.5 | 2.2 ± 1.6 | 2.1 ± 1.3 |
| Concentration | 0.1 ± 0 | 0.1 ± 0 | 0.1 ± 0 |

### Pairwise Statistical Tests

| Comparison | Metric | Δ (mean) | p-value | Cliff's δ | Verdict |
|------------|--------|----------|---------|-----------|---------|
| v2.1→v2.2 | Success Rate | +0.00 | 0.8711 | 0.030 (negligible) | ➖ ns |
| v2.1→v2.2 | Fraud (sats) | -0.30 | 0.8817 | 0.028 (negligible) | ➖ ns |
| v2.1→v2.2 | Mal. Routing | -0.04 | 0.4094 | 0.152 (small) | ➖ ns |
| v2.1→v2.2 | Recovery (rds) | +0.30 | 0.4570 | -0.138 (negligible) | ➖ ns |
| v2.1→v2.2 | Concentration | +0.00 | 0.4989 | 0.125 (negligible) | ➖ ns |
| v2.1→v2.3 | Success Rate | +0.00 | 0.5885 | 0.100 (negligible) | ➖ ns |
| v2.1→v2.3 | Fraud (sats) | +3.75 | 0.2559 | -0.210 (small) | ➖ ns |
| v2.1→v2.3 | Mal. Routing | +0.00 | 0.9031 | -0.022 (negligible) | ➖ ns |
| v2.1→v2.3 | Recovery (rds) | +0.25 | 0.5162 | -0.120 (negligible) | ➖ ns |
| v2.1→v2.3 | Concentration | +0.00 | 0.4652 | 0.135 (negligible) | ➖ ns |
| v2.2→v2.3 | Success Rate | +0.00 | 0.6949 | 0.072 (negligible) | ➖ ns |
| v2.2→v2.3 | Fraud (sats) | +4.05 | 0.2793 | -0.200 (small) | ➖ ns |
| v2.2→v2.3 | Mal. Routing | +0.04 | 0.3942 | -0.158 (small) | ➖ ns |
| v2.2→v2.3 | Recovery (rds) | -0.05 | 0.7764 | 0.052 (negligible) | ➖ ns |
| v2.2→v2.3 | Concentration | +0.00 | 0.9031 | -0.022 (negligible) | ➖ ns |

### Stability Analysis

| Metric | v2.1 σ | v2.2 σ | v2.3 σ | Best |
|--------|------|------|------|------|
| Fraud σ | 14.09 | 14.37 | 12.41 | **v2.3** |
| Routing σ | 0.1400 | 0.1200 | 0.1500 | **v2.2** |

### Catastrophic Outlier Analysis

| Version | Catastrophic Seeds | Rate | IQR Outliers |
|---------|-------------------|------|-------------|
| v2.1 | 3/20 (15%) | >35 sats | 0 |
| v2.2 | 2/20 (10%) | >39 sats | 1 |
| v2.3 | 1/20 (5%) | >37 sats | 0 |

### Honest Routing Analysis

| Metric | v2.1 | v2.2 | v2.3 |
|--------|------|------|------|
| Honest Routing Mean | 74.0% | 78.0% | 74.0% |
| Honest Routing σ | 14.00% | 12.00% | 15.00% |

---

## Decision Gate — Best Version Selection

| Version | Wins | Total Criteria | Win Rate |
|---------|------|----------------|----------|
| **v2.1** | 0 | 4 | **0%** |
| **v2.2** | 2 | 4 | **50%** |
| **v2.3** | 2 | 4 | **50%** |

### Win Breakdown

**v2.1** (0 wins):
  - (none)

**v2.2** (2 wins):
  - strategic-default/N=50: lowest fraud
  - strategic-default/N=50: best honest routing

**v2.3** (2 wins):
  - strategic-default/N=50: lowest variance
  - strategic-default/N=50: fewest catastrophic seeds

> **RECOMMENDED PAPER SYSTEM: v2.2** — Won 2/4 criteria across all conditions.
