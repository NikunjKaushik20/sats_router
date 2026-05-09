# TRACE Submission Package
# paper/reproducibility/README.md — v2 (Polish pass)

## System Requirements

- **Node.js** ≥ 18.0 (tested: v18.20.x)
- **TypeScript** via `tsx` (`npm install -g tsx`)
- **Python** ≥ 3.11 (for figure rendering)
- **Python packages**: `matplotlib>=3.8`, `numpy>=1.24` (`pip install matplotlib numpy`)
- **OS**: Linux/macOS/Windows (tested on Windows 11 + Ubuntu 22.04)

---

## Exact Reproduction Commands

### 1. Install dependencies

```bash
npm install
```

### 2. Reproduce primary baseline comparison (Table 4)

```bash
# Collusion ring attack — all scales, 20 seeds
npx tsx scripts/runVersionComparison.ts \
  --attacks collusion-ring \
  --agents 30,50,100 \
  --seeds 20

# Strategic default — N=50, 20 seeds
npx tsx scripts/runVersionComparison.ts \
  --attacks strategic-default \
  --agents 50 \
  --seeds 20
```

### 3. Reproduce version comparison (Table 8, Fig 5, Fig 6)

```bash
# 3-way v2.1/v2.2/v2.3 comparison — N=50, 20 seeds, 2 attacks
npx tsx scripts/runVersionComparison.ts \
  --attacks collusion-ring,strategic-default \
  --agents 50 \
  --seeds 20 \
  --versions v2.1,v2.2,v2.3
```

### 4. Reproduce sensitivity analysis (Fig 7)

```bash
npx tsx scripts/runSensitivityAnalysis.ts \
  --attack collusion-ring \
  --agents 50 \
  --seeds 5 \
  --perturbations -50,-25,0,25,50
```

### 5. Render all paper figures (PDF + PNG + SVG)

```bash
python -X utf8 scripts/render_figures_v2.py
# Output: paper/figures/fig{1..7}.{pdf,png,svg}
```

### 6. Verify statistical summary

```bash
python -X utf8 scripts/verify_stats.py
# Output: paper/results/statistical_summary.csv
```

---

## Canonical Seeds

All 20-seed experiments use seeds `1` through `20` (integer range, passed as `--seeds 20`).
Sensitivity analysis uses seeds `1` through `5`.

---

## Configuration Lock

The paper system is TRACE v2.1 with all extensions disabled:

```typescript
// src/lib/trace/config.ts
export const VERSION = "2.1-paper-locked";

// Extensions must remain disabled:
// adaptiveConfig.ts:  ADAPTIVE_SCALING.enabled = false
// causalGraph.ts:     CAUSAL_CONFIG.enabled     = false
// temporalTrust.ts:   TEMPORAL_CONFIG.enabled   = false
```

---

## Expected Outputs (Verified)

| Condition | Policy | N | Seeds | Mean Fraud (sats) | Std |
|-----------|--------|---|-------|-------------------|-----|
| Collusion ring | TRACE | 50 | 20 | 43.8 | 23.8 |
| Collusion ring | Price | 50 | 20 | 116.0 | 20.8 |
| Collusion ring | Reputation | 50 | 20 | 62.8 | 23.3 |
| Strategic default | TRACE | 50 | 20 | 14.1 | 13.4 |
| Strategic default | Reputation | 50 | 20 | 21.2 | 12.5 |
| Strategic default | Price | 50 | 20 | 45.2 | 15.7 |
| Collusion ring | TRACE | 100 | 20 | 9.0 | 11.8 |

---

## File Inventory

```text
paper/
├── drafts/
│   ├── section1_intro_abstract.md   # Abstract + Intro + Problem Formulation
│   ├── section3_system_design.md    # TRACE architecture + scoring formula
│   ├── section4_evaluation.md       # Threat models, setup, all results
│   ├── section5_related_work.md     # Cited prior work + differentiation table
│   ├── section6_methodology.md      # Statistical methodology
│   └── section7_conclusion.md       # Conclusion + future work
├── figures/
│   ├── fig1_architecture.{pdf,png,svg}
│   ├── fig2_threat_models.{pdf,png,svg}
│   ├── fig3_scaling_fraud.{pdf,png,svg}
│   ├── fig4_ablation.{pdf,png,svg}
│   ├── fig5_complexity_stability.{pdf,png,svg}
│   ├── fig6_false_suppression.{pdf,png,svg}
│   ├── fig7_sensitivity.{pdf,png,svg}
│   └── CAPTIONS.md
├── references/
│   └── citation_tracker.md          # 14 resolved citations + BibTeX
├── results/
│   ├── master_results.csv           # 614 experiments
│   ├── statistical_summary.csv      # Mann-Whitney U + Cliff's delta
│   └── version_comparison.csv       # v2.1/v2.2/v2.3 pairwise tests
├── reproducibility/
│   └── README.md                    # This file
├── claims_registry.md               # Every claim mapped to evidence
├── CONTRIBUTIONS.md                 # 7 contributions + non-claims
├── REVIEW_CHECKLIST.md              # Pre-submission checklist
├── REVIEWER_SIMULATION.md           # Skeptical reviewer Q&A
└── reviewer_notes.md                # Weak points + fixes
```
