# TRACE Paper — All Tables (LaTeX + Markdown)

---

## T1: TRACE Feature Overview

### Markdown

| Component | Description | Mechanism |
|-----------|-------------|-----------|
| Completion Rate | Historical job success rate | Exponential moving average |
| Repayment Rate | Fraction of invoices settled | Running ratio |
| TRACE Score | Composite trust index | Weighted sum of 6 factors |
| Counterparty Entropy | Routing diversity measure | Shannon entropy H(p) |
| Repeated-Pair Decay | Penalizes narrow routing loops | Exponential suppression |
| Clique Penalty | Flags tight collusion clusters | Low-diversity cutoff |
| Sybil Risk | Guards against identity farming | Progressive unlock threshold |

### LaTeX

```latex
\begin{table}[h]
\centering
\caption{TRACE v2.1 Scoring Components}
\label{tab:trace-features}
\begin{tabular}{lll}
\toprule
Component & Description & Mechanism \\
\midrule
Completion Rate & Historical job success & EMA \\
Repayment Rate & Invoice settlement fraction & Running ratio \\
Counterparty Entropy & Routing diversity & Shannon $H(p)$ \\
Repeated-Pair Decay & Penalizes routing loops & Exponential suppression \\
Clique Penalty & Tight cluster detection & Low-diversity cutoff \\
Sybil Risk & Identity farming guard & Progressive unlock \\
\bottomrule
\end{tabular}
\end{table}
```

---

## T2: Attack Definitions

### Markdown

| Attack | Malicious Behavior | Economic Goal |
|--------|--------------------|---------------|
| **Collusion Ring** | Mutual endorsement among colluders to inflate TRACE scores | Sustained fraudulent job completion |
| **Strategic Default** | Accept job, collect payment, fail delivery | One-time extraction per transaction |
| **Sybil Cluster** | Create many fake identities sharing trust | Dominate routing share via volume |
| **Whitewashing** | Abandon bad-reputation identity, restart fresh | Escape trust penalties permanently |

### LaTeX

```latex
\begin{table}[h]
\centering
\caption{Adversarial Attack Definitions}
\label{tab:attacks}
\begin{tabular}{lll}
\toprule
Attack & Behavior & Economic Goal \\
\midrule
Collusion Ring & Mutual endorsement inflation & Sustained fraud \\
Strategic Default & Accept then default & One-time extraction \\
Sybil Cluster & Fake identity farming & Routing domination \\
Whitewashing & Identity reset & Reputation escape \\
\bottomrule
\end{tabular}
\end{table}
```

---

## T3: Experimental Setup

### Markdown

| Parameter | Value |
|-----------|-------|
| Network scales | N = 30, 50, 100 |
| Malicious agent ratio | 30% |
| Rounds per experiment | 60 |
| Jobs per round | 5 |
| Seeds (multi-seed) | 1–20 (20 seeds) |
| Agent model mix | GPT-4o Mini / Sarvam AI / Llama 3.2 3B (≈1:1:1) |
| Pricing range | 3–18 sats/job (model-dependent) |
| Policies evaluated | TRACE, REPUTATION, PRICE |
| Statistical tests | Mann-Whitney U (two-tailed), Cliff's Delta |
| Significance threshold | p < 0.05 |

### LaTeX

```latex
\begin{table}[h]
\centering
\caption{Experimental Configuration}
\label{tab:setup}
\begin{tabular}{ll}
\toprule
Parameter & Value \\
\midrule
Network scales & $N \in \{30, 50, 100\}$ \\
Malicious ratio & 30\% \\
Rounds & 60 \\
Jobs/round & 5 \\
Seeds & 20 (seeds 1--20) \\
Agent mix & GPT-4o Mini / Sarvam AI / Llama 3B ($\approx$1:1:1) \\
Significance threshold & $p < 0.05$ (Mann-Whitney U) \\
\bottomrule
\end{tabular}
\end{table}
```

---

## T4: Main Results — TRACE vs Baselines

### Markdown (Collusion Ring, N=50, 20 seeds)

| Policy | Success Rate | Fraud (sats) | Mal. Routing | Recovery (rds) |
|--------|:-----------:|:------------:|:------------:|:--------------:|
| **TRACE** | **93.0%** | **41.5 ± 23.4** | **20.0%** | **0.3** |
| REPUTATION | 93.3% | 40 (baseline) | 9.7% | 0 |
| PRICE | 90.3% | 154 | 77.0% | 0 |

> Note: TRACE reduces malicious routing vs PRICE by 74pp under collusion.
> REPUTATION has lower fraud but zero strategic-default defense (see T4b).

### T4b: Strategic-Default Attack (N=50, 20 seeds)

| Policy | Success Rate | Fraud (sats) | Recovery (rds) |
|--------|:-----------:|:------------:|:--------------:|
| **TRACE** | **99.7%** | **13.0 ± 14.1** | **1.9** |
| REPUTATION | 72.3% | 380+ | >15 |
| PRICE | 68.0% | 420+ | >15 |

> TRACE uniquely handles strategic default — reputation-only systems have no defense.

---

## T5: Scaling Results

### Markdown

| Scale | Policy | Success Rate | Fraud (sats) | Mal. Routing | Concentration |
|-------|--------|:-----------:|:------------:|:------------:|:-------------:|
| N=30 | **TRACE** | 92.0% | 84 | 40.7% | 0.1233 |
| N=30 | REPUTATION | 94.7% | 40 | 9.7% | 0.1225 |
| N=30 | PRICE | 90.3% | 154 | 77.0% | 0.1272 |
| N=50 | **TRACE** | 95.3% | 38 | 18.3% | 0.1428 |
| N=50 | REPUTATION | 93.3% | — | — | — |
| N=50 | PRICE | 90.0% | — | — | — |
| N=100 | **TRACE** | 97.0% | 22 | 12.0% | 0.1180 |
| N=100 | REPUTATION | — | — | — | — |
| N=100 | PRICE | — | — | — | — |

> Key finding: TRACE fraud exposure decreases with scale (84→38→22 sats).

---

## T6: Ablation Results

### Markdown (Collusion Ring, N=50)

| Configuration | Fraud (sats) | Mal. Routing | Notes |
|---------------|:------------:|:------------:|-------|
| Full TRACE v2.1 | **41.5** | **20.0%** | Baseline |
| − Repeated-pair decay | ~85 | ~38% | +105% fraud |
| − Clique penalty | ~62 | ~29% | +49% fraud |
| − Both | ~148 | ~65% | +257% fraud |

> Repeated-pair decay is the strongest individual component.

---

## T7: Sensitivity Analysis

### Markdown

| Parameter | Baseline | ±25% | ±50% | Metric Impact |
|-----------|----------|------|------|---------------|
| Counterparty entropy weight | 0.20 | Stable | ±12% fraud | Low sensitivity |
| Repeated-pair decay rate | 0.15 | Stable | ±18% fraud | Medium |
| Clique penalty threshold | 0.40 | Stable | ±8% fraud | Low sensitivity |
| Malicious ratio | 30% | 20%→15%, 40%→68% | — | Expected scaling |

> TRACE degrades gracefully — no catastrophic collapse observed.

---

## T8: Version Comparison (v2.1 vs v2.2 vs v2.3)

### Markdown — Collusion Ring, N=50, 20 seeds

| Metric | v2.1 | v2.2 | v2.3 |
|--------|:----:|:----:|:----:|
| Fraud mean (sats) | **36.9** | 39.0 | 45.0 |
| Fraud σ | **22.84** | 24.21 | 30.82 |
| Honest Routing | **82%** | 79% | 79% |
| Catastrophic seeds | **1/20** | 1/20 | 2/20 |
| Decision gate wins | **4/4** | 0/4 | 0/4 |

### LaTeX

```latex
\begin{table}[h]
\centering
\caption{Version Comparison: TRACE v2.1 vs v2.2 vs v2.3 (Collusion Ring, $N=50$, 20 seeds)}
\label{tab:version-comparison}
\begin{tabular}{lccc}
\toprule
Metric & v2.1 & v2.2 & v2.3 \\
\midrule
Fraud mean (sats) & \textbf{36.9} & 39.0 & 45.0 \\
Fraud $\sigma$ & \textbf{22.84} & 24.21 & 30.82 \\
Honest routing & \textbf{82\%} & 79\% & 79\% \\
Catastrophic seeds & \textbf{1/20} & 1/20 & 2/20 \\
Decision gate wins & \textbf{4/4} & 0/4 & 0/4 \\
\bottomrule
\end{tabular}
\end{table}
```

---

## T9: Statistical Significance Summary

### Markdown

| Comparison | Tests Run | Significant (p<0.05) | Max Effect Size |
|------------|:---------:|:--------------------:|:---------------:|
| TRACE vs PRICE (collusion) | 5 | 3/5 | large |
| TRACE vs REPUTATION (strategic-default) | 5 | 4/5 | large |
| v2.1 vs v2.2 (collusion) | 5 | 0/5 | negligible |
| v2.1 vs v2.3 (collusion) | 5 | 0/5 | small |
| v2.2 vs v2.3 (collusion) | 5 | 0/5 | negligible |
| v2.1 vs v2.2 (strategic-default) | 5 | 0/5 | small |
| v2.1 vs v2.3 (strategic-default) | 5 | 0/5 | small |

> Key finding: TRACE vs baselines is statistically significant; v2.1/v2.2/v2.3 are indistinguishable.

### LaTeX

```latex
\begin{table}[h]
\centering
\caption{Statistical Significance Summary (Mann-Whitney U, $p < 0.05$)}
\label{tab:significance}
\begin{tabular}{lccc}
\toprule
Comparison & Tests & Significant & Max $|\delta|$ \\
\midrule
TRACE vs PRICE (collusion) & 5 & 3/5 & large \\
TRACE vs REP (strategic-default) & 5 & 4/5 & large \\
v2.1 vs v2.2 & 10 & 0/10 & negligible \\
v2.1 vs v2.3 & 10 & 0/10 & small \\
v2.2 vs v2.3 & 10 & 0/10 & negligible \\
\bottomrule
\end{tabular}
\end{table}
```
