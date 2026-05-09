# TRACE v2.1 — Reproducibility Package

## Environment

| Requirement | Version |
|-------------|---------|
| Node.js | ≥ 18.0 |
| TypeScript | ≥ 5.0 |
| tsx | ≥ 4.0 |
| pnpm / npm | any |

```bash
npm install
```

## Reproducing Paper Results

All experiments use seeds 1–20. See `seeds.txt` for the canonical list.

### 1. Main Results (TRACE vs REPUTATION vs PRICE)

```bash
# N=30, 50, 100 — all attacks — 20 seeds
npx tsx scripts/runFinalMatrix.ts --seeds 20
```

### 2. Version Comparison (v2.1 vs v2.2 vs v2.3)

```bash
# 120-experiment matrix — collusion + strategic-default
npx tsx scripts/runVersionComparison.ts --attacks collusion-ring --seeds 20
npx tsx scripts/runVersionComparison.ts --attacks strategic-default --seeds 20
```

### 3. Single Experiment

```bash
npx tsx scripts/runExperiment.ts \
  --attack collusion-ring \
  --agents 50 \
  --seed 1 \
  --policy TRACE
```

## Frozen Configuration

The locked v2.1 configuration is in `configs/final/v2_1_locked.json`.

Key feature flags:
- `ADAPTIVE_SCALING.enabled = false`
- `CAUSAL_CONFIG.enabled = false`
- `TEMPORAL_CONFIG.enabled = false`

## Results Location

All results are written to `results/`. Each experiment creates a subdirectory with:
- `metrics.json` — primary metrics
- `rounds.json` — per-round data
- `summary.txt` — human-readable

## Git Tag

The exact codebase used for all paper results:

```bash
git checkout v2.1-paper-locked
```

## Validation Evidence

See `results/VALIDATION_RESULTS.md` for the full 3-way comparison.
See `paper/results/master_results.csv` for all 614 raw experiment records.
