# TRACE Paper — Claims Registry

> Every claim in the paper must appear here with supporting evidence.
> Status: ✅ Supported | ⚠️ Weaken | ❌ Remove

---

## Abstract Claims

| # | Claim | Evidence | Figure/Table | Status |
|---|-------|----------|--------------|--------|
| A1 | TRACE reduces fraud 73% vs price-based routing under collusion | collusion-ring, N=50, 20 seeds: TRACE 41.5 vs PRICE ~154 sats | Fig 3 | ✅ |
| A2 | Reputation-only suffers 18× higher fraud under strategic default | strategic-default: REP >380 sats vs TRACE 13.0 ± 14.1 | Tbl 4b | ✅ |
| A3 | Extensions increase fraud variance by up to 35% | v2.1 σ=22.84 → v2.3 σ=30.82, collusion-ring | Fig 5b | ✅ |
| A4 | Extensions reduce honest routing by 3 pp | 82% → 79%, collusion-ring, 20 seeds | Fig 5c / Fig 6 | ✅ |
| A5 | "without statistically significant improvement" | 0/30 tests p<0.05 | Tbl 9 | ✅ |
| A6 | TRACE maintains robustness under strategic default | 99.7% success, 13.0 sats fraud | Tbl 4b | ✅ |

---

## Introduction Claims

| # | Claim | Evidence | Figure/Table | Status |
|---|-------|----------|--------------|--------|
| I1 | "77% malicious routing rate [PRICE]" | N=50, collusion-ring, seed 42 baseline | Fig 3 | ✅ (clarify: single-seed) |
| I2 | ">380 sats fraud [REPUTATION, strategic-default]" | Strategic-default results | Tbl 4b | ✅ |
| I3 | "first empirical evaluation of composite trust routing in adversarial LLM marketplace" | Novel combination confirmed | — | ⚠️ Soften: "to our knowledge" |
| I4 | "statistically significant improvement over baselines" | p<0.01 TRACE vs PRICE collusion | Tbl 9 | ✅ |
| I5 | "TRACE fraud decreases monotonically 84→38→22 sats" | scaling experiments, seed 42 | Fig 3 | ⚠️ Clarify: single-seed; multi-seed shows trend |
| I6 | "fundamental false-positive tax" | Mechanistic argument, not directly measured | — | ⚠️ Frame as "hypothesized mechanism" |

---

## Section 3 (System Design) Claims

| # | Claim | Evidence | Figure/Table | Status |
|---|-------|----------|--------------|--------|
| S1 | "decreasing marginal trust credit to repeated interactions" | Code: decay(n) = exp(−λ·max(0, n−n_thresh)) | Tbl 1 | ✅ |
| S2 | "trust saturation prevents indefinite inflation" | Implementation: nonlinear cap at 900 | Tbl 1 | ✅ |
| S3 | "no external oracle, no cross-orchestrator coordination" | Architecture: local computation only | Fig 1 | ✅ |
| S4 | "fully interpretable: every decision decomposed into four factors" | Routing utility formula | §3.4 | ✅ |

---

## Section 4 (Evaluation) Claims

| # | Claim | Evidence | Figure/Table | Status |
|---|-------|----------|--------------|--------|
| E1 | "74.7 pp reduction in malicious routing vs PRICE" | 18.3% vs 77.0%, N=50, collusion | Fig 3 | ✅ |
| E2 | "p < 0.01, Cliff's δ = 0.71" | Mann-Whitney TRACE vs PRICE, fraud | Tbl 9 | ⚠️ Verify exact value from significance.csv |
| E3 | "scaling property of diversity-weighted routing" | Mechanistic argument | Fig 3 | ⚠️ Frame as "consistent with" not "proves" |
| E4 | "removing repeated-pair decay increases fraud ~105%" | Ablation estimate | Fig 4 | ⚠️ Label as "estimated — full ablation pending" |
| E5 | "257% increase removing both mechanisms" | Ablation estimate | Fig 4 | ⚠️ Same caveat |
| E6 | "35% variance increase baseline to max complexity" | (30.82 − 22.84) / 22.84 = 34.9% | Fig 5b | ✅ |
| E7 | "two catastrophic outlier seeds for v2.3 vs one for v2.1" | Validation results | Tbl 8 | ✅ |
| E8 | "zero of thirty pairwise tests reached significance" | version_comparison CSVs | Tbl 9 | ✅ |
| E9 | "graceful degradation — no catastrophic collapse" | Sensitivity: max ±18% fraud at ±50% param | Fig 7 | ✅ |

---

## Dangerous Language Audit

| Location | Phrase Found | Action |
|----------|-------------|--------|
| Abstract | *(clean)* | — |
| Intro P1 | "enables a new class of economic actor" | ✅ keep |
| Intro P4 | "first empirical evaluation" | ⚠️ → "to our knowledge, one of the first" |
| §4.3 | "catastrophically vulnerable" | ⚠️ → "demonstrates substantially higher fraud exposure" |
| §4.3 | "p < 0.001" for strategic-default | ⚠️ Verify from actual test data |
| §4.4 | "significantly more than the sum" | ⚠️ → "more than the sum of individual effects" (superadditive not tested) |
| §4.5 | "fundamental false-positive tax" | ⚠️ → "a false-positive tax effect consistent with..." |
| §3.2 | "making it structurally expensive" | ✅ appropriately hedged |

---

## Claims to Remove

| Claim | Location | Reason |
|-------|----------|--------|
| "TRACE solves agent trust" | *(not present — good)* | — |
| "guarantees robustness" | *(not present — good)* | — |
| "proves scaling is structural" | §4.3 | → "is consistent with" |
| Exact p<0.001 for strategic-default | §4.3 | Unverified — remove until confirmed |

---

## Version Story Registry

| Version | Role in Paper | Description |
|---------|--------------|-------------|
| v2.1 | **Final proposed system** | The paper's contribution |
| v2.2 | Exploratory extension | Scale-aware + causal graph — evaluated, not adopted |
| v2.3 | Overengineering case study | Temporal trust — increases instability, future work |

> Do NOT frame as development diary. Frame as: "We designed v2.1, then rigorously evaluated whether extensions improved it — they did not."

---

## Core Thesis (Locked)

> "More trust-model complexity is not always beneficial; beyond a threshold, additional sophistication introduces false-positive instability that harms adversarial robustness."
