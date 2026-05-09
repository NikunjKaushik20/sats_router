# TRACE Paper — Contributions
# Concise enumeration of paper contributions with evidence pointers

| # | Contribution | Evidence | Section/Figure |
|---|-------------|----------|---------------|
| 1 | **TRACE v2.1 routing framework** — composite trust scoring integrating six behavioral factors (completion history, repayment rate, default probability, counterparty entropy, Sybil risk, repeated-pair concentration) into a routing utility requiring no external oracle or cross-orchestrator coordination | System design + implementation | §3 |
| 2 | **Baseline comparison** — empirical demonstration that TRACE outperforms price-only routing under collusion ring attack (Cliff's \|δ\| = 0.976, large, p < 0.001) and that no individual baseline is robust across both collusion and strategic-default attack types | 20-seed experiments | §4.3, Fig 3, Tbl 4 |
| 3 | **Scaling characterization** — TRACE fraud exposure decreases consistently with network scale under collusion (56.0 → 43.8 → 9.0 sats, N=30/50/100), consistent with structural properties of diversity-weighted routing | Scaling experiments | §4.3, Fig 3 |
| 4 | **Ablation analysis** — directional characterization of individual component contributions: repeated-pair decay (~+105%) and clique penalty (~+49%) both contribute independently, with superadditive interaction when removed together (~+257%) | Ablation estimates (limited seeds) | §4.4, Fig 4 |
| 5 | **Complexity-instability finding** — empirical evidence that two well-motivated extensions (adaptive scaling, temporal trust dynamics) increase fraud variance by 35% and reduce honest-agent routing share by 3 pp without statistically significant fraud reduction (0/30 tests p<0.05) | 120-experiment version comparison | §4.5, Fig 5, Fig 6 |
| 6 | **False suppression evaluation** — explicit measurement of honest-agent routing share as a false-positive proxy, demonstrating that complexity-induced instability specifically harms honest-agent utilization | Version comparison | §4.5, Fig 6 |
| 7 | **Reproducibility package** — frozen configs, canonical seeds, environment specification, and reproduction commands enabling full experimental replication | paper/reproducibility/ | §6 |

---

## What TRACE is NOT claiming

| Non-Claim | Why |
|-----------|-----|
| TRACE solves agent trust | Out of scope; addresses one routing layer |
| TRACE is optimal | No theoretical optimality guarantee; empirical characterization only |
| Extensions never work | Only validated at N ≤ 100; future work at larger scale |
| TRACE outperforms Reputation under collusion | TRACE vs Reputation collusion difference not significant (p=0.052) |
| Results generalize to live deployed systems | Simulation only; real deployment is future work |
