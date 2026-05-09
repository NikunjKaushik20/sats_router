# TRACE Paper — Section 4: Evaluation
# Draft v2 — 2026-05-09 (Polish pass: key takeaways, metric focus, calibrated language)

---

## 4.1 Threat Models

We evaluate TRACE under four adversarial attack profiles representing the principal economic
threats in permissionless agent marketplaces.

**Collusion Ring.** A subset of malicious agents form a coordinated coalition, mutually endorsing
each other through synthetic successful transactions to inflate trust scores. The goal is to reach
trust tiers sufficient for sustained legitimate job routing, then either extract payment without
full delivery or route work to coalition members. At N=50 with 30% malicious agents, 15 colluders
execute up to 16 coordinated endorsement actions per round.

**Strategic Default.** Malicious agents build legitimate trust histories across multiple rounds,
then selectively default on high-value jobs — accepting Lightning payment but failing to deliver
contracted service. Strategic defaulters do not coordinate; each acts to maximize individual
per-transaction extraction. This attack is structurally invisible to reputation-only systems
because it exploits accumulated legitimate history rather than manipulating it.

**Sybil Cluster.** A single adversarial entity registers multiple provider identities that
collectively build trust through shared interactions. Individual Sybil nodes appear legitimate in
isolation; the attack is detectable only through routing concentration patterns at the cluster
level.

**Whitewashing.** Malicious agents periodically abandon and re-register provider identities when
accumulated penalties reduce routing probability below a threshold, escaping trust penalties
without improving underlying service quality.

---

## 4.2 Experimental Setup

We simulate an agent marketplace with N ∈ {30, 50, 100} providers drawn from three LLM-inspired
archetypes: GPT-4o Mini (8–18 sats/job), Sarvam AI (5–12 sats/job), and Llama 3.2 3B
(3–8 sats/job), distributed approximately equally. Each experiment runs 60 rounds of 5 jobs
(300 jobs total), with 30% of agents malicious from initialization.

**Routing policies evaluated:**
- **TRACE** — composite trust-based routing (v2.1; adaptive, causal, and temporal extensions
  disabled per validation results)
- **Reputation** — selects provider with highest cumulative success rate
- **Price** — selects lowest-cost available provider

All multi-seed experiments use 20 independent random seeds (1–20). Results are reported as
mean ± standard deviation across seeds. Statistical comparisons use Mann-Whitney U (two-tailed,
α = 0.05) with Cliff's Delta for effect size estimation [Romano et al., 2006].

**Primary metrics:**
- **Fraud exposure** (sats): cumulative economic loss from successful fraudulent transactions
- **Malicious routing rate**: fraction of jobs routed to malicious agents
- **Honest routing share**: complement of malicious routing rate; proxy for false suppression
- **Recovery time**: rounds to restore post-attack success rate to pre-attack level

---

## 4.3 Core Routing Results

**Collusion resistance.** Table 4 presents results under collusion ring attack at N=50. TRACE
reduces mean fraud exposure to 43.8 ± 23.8 sats compared to 116.0 ± 20.8 sats for Price-only
routing (Mann-Whitney U, p < 0.001, Cliff's |δ| = 0.976, large effect [Romano et al., 2006]).
Malicious routing rate under TRACE (21.4%) is also substantially lower than Price-only (57.4%)
at N=50. Reputation routing exhibits lower mean fraud than TRACE at N=50 (62.8 vs 43.8 sats)
but the difference is not statistically significant (p = 0.052, Cliff's |δ| = 0.467, medium);
this reflects Reputation's strong collusion resistance via cumulative success-rate tracking.

**Strategic-default robustness.** Table 4b compares policies under strategic-default attack —
the condition that most sharply differentiates the systems. Under strategic default at N=50,
TRACE mean fraud exposure is 14.1 ± 13.4 sats. Reputation routing, which accumulates success
rates over full history, provides no structural protection against agents that exploit accumulated
history to default selectively: Reputation mean fraud is 21.2 sats (malicious routing rate
51.4%), compared to TRACE's 25.2%. Price routing exposes 45.2 sats (malicious routing 63.9%).
TRACE is the only evaluated baseline that constrains both collusion and strategic default
meaningfully under the evaluated conditions.

> **Key takeaway:** Price-only routing fails under collusion (Cliff's |δ| = 0.976 vs TRACE,
> large effect, p < 0.001). Reputation-only fails under strategic default (51.4% vs 25.2%
> malicious routing). TRACE provides consistent resistance across both conditions. Note that
> the TRACE vs Reputation difference under collusion does not reach conventional significance
> at N=50 (p = 0.052); larger samples or stronger attacks may widen this gap.

**Scaling behavior.** Under collusion ring attack, TRACE mean fraud decreases consistently
across the evaluated scale range: 56.0 sats (N=30) → 43.8 sats (N=50) → 9.0 sats (N=100),
with a statistically significant difference between N=50 and N=100 (p < 0.001,
Cliff's |δ| = 1.00, Fig. 3). This pattern is consistent with the diversity-weighted routing
mechanism: larger honest-agent populations provide more routing alternatives, increasing the
structural cost for colluders to sustain inflated routing share. Whether this scaling generalizes
beyond N=100 is left for future work.

---

## 4.4 Ablation Analysis

To characterize the contribution of individual TRACE v2.1 mechanisms, we evaluate targeted
removal conditions. These results are estimated from limited seeds and should be interpreted as
directional rather than definitive; a full multi-seed ablation study is identified as future work.

**Repeated-pair decay** is the largest individual contributor. Its removal increases fraud
exposure by approximately 105% (41.5 → ~85 sats) and malicious routing from 20% to ~38%
(Fig. 4). The mechanism directly penalizes the collusion-characteristic pattern of concentrated
mutual endorsement, forcing routing exploration even when a coalition has successfully inflated
trust scores.

**Clique penalty** contributes at the network level: its removal increases fraud by approximately
49%. It targets agents whose entire interaction graph is low-diversity — catching colluders who
spread endorsements across a closed subset rather than a single pair.

**Component interaction.** Removing both mechanisms simultaneously produces a larger increase
(~257%) than either individually, consistent with the two mechanisms addressing different
structural dimensions of the same attack — pairwise concentration and network-level diversity
respectively. Sophisticated colluders can exploit whichever dimension is unguarded.

> **Key takeaway:** Both repeated-pair decay and clique penalty make meaningful independent
> contributions, and their combination provides defense at complementary structural levels.
> The ablation estimates motivate retaining both mechanisms in v2.1.

---

## 4.5 Complexity-Induced Instability

This section presents a negative result: increasing TRACE's architectural sophistication beyond
the v2.1 baseline does not improve robustness under the evaluated conditions, and measurably
increases variance and false suppression.

We evaluated two extensions designed to improve collusion resistance:
- **v2.2**: Adaptive scale-aware penalty scaling + causal graph failure tracking
- **v2.3**: All v2.2 features + temporal trust dynamics (trust velocity, reciprocal amplification
  detection, economic depth maturation)

**Results.** Table 8 and Fig. 5 summarize the comparison across 120 experiments (3 versions ×
2 attacks × 20 seeds). Under collusion ring attack, fraud variance increases monotonically with
extension complexity: v2.1 σ = 22.84 → v2.2 σ = 24.21 → v2.3 σ = 30.82 sats, a 35% increase
from baseline to maximum complexity. Honest-agent routing share decreases by 3 percentage points
under both extensions (82% → 79%, Fig. 6). v2.3 produces two catastrophic outlier seeds
(fraud > 98 sats) versus one for v2.1 (fraud > 74 sats). Across 30 pairwise statistical tests,
zero reach significance (p < 0.05); the three versions are statistically indistinguishable in
central fraud tendency.

**Mechanism.** We attribute this pattern to a false-positive tax effect: at N=50 with 30%
malicious agents, the network is dense enough that heuristic penalties — scale-aware suppression
at factor 0.5, causal root-cause attribution, and temporal velocity flagging — affect honest
agents with non-negligible frequency. Each mechanism adds a marginal honest-agent penalty that
cumulatively exceeds the marginal improvement in malicious detection. This interpretation is
consistent with the precision-recall tradeoff in adversarial detection settings [cite], though
we do not directly measure the false-positive rate on individual agents.

**Scope.** These findings are specific to N ∈ {30, 50} with 30% malicious agents. The evaluated
extensions may prove beneficial at larger scales (N > 200) where the signal-to-noise ratio of
behavioral heuristics improves and honest-agent penalties are amortized across a larger population.
We leave this as future work.

> **Key takeaway:** More detection sophistication is not uniformly beneficial. At medium scale,
> v2.2 and v2.3 extensions increase outcome variance and reduce honest-agent routing without
> statistically significant fraud reduction. This motivates careful empirical validation of trust
> mechanism extensions before deployment, even when theoretically well-motivated.

---

## 4.6 Sensitivity Analysis

TRACE v2.1 degrades gracefully under parameter perturbation (Table 7, Fig. 7). We independently
perturb each hyperparameter by ±25% and ±50% from its default, measuring fraud exposure change
under collusion ring attack at N=50 (5 seeds).

No perturbation produces catastrophic failure. The counterparty entropy weight (w₄ = 0.20) shows
the lowest sensitivity: ±25% perturbation changes fraud exposure by less than 12%. The
repeated-pair decay rate shows moderate sensitivity (±18% fraud change at ±50% perturbation),
consistent with its role as the strongest ablation component. The clique penalty threshold shows
low sensitivity (±8%).

Sensitivity to the malicious agent ratio follows the expected pattern: 20% malicious → lower
fraud; 40% malicious → higher fraud. This confirms the experimental setup correctly models
attack intensity scaling.

> **Key takeaway:** TRACE v2.1's behavior is not contingent on precise parameter calibration —
> a practical requirement for deployment where system parameters cannot be tuned adversarially.

---

## 4.7 Limitations

This evaluation has several limitations that constrain the scope of its conclusions.

**Simulation fidelity.** Results are obtained from a simulation of an agent marketplace rather
than a live deployed system. Provider behavior is parameterized from LLM pricing distributions
but does not involve actual LLM inference. Real-world adversarial behavior may differ from the
simulated attack models.

**Attack model coverage.** We evaluate four attack types. Combinations of attacks, adaptive
adversaries that respond to TRACE's detection mechanisms, or novel attack types not modeled here
may produce different results.

**Scale range.** All experiments use N ∈ {30, 50, 100}. Behavior at larger scales (N > 200) or
with higher malicious ratios (> 40%) is not characterized.

**Ablation completeness.** Ablation results in §4.4 are estimated from limited seeds and should
be treated as directional. A full 20-seed ablation study is identified as future work.

**Single-orchestrator model.** TRACE is evaluated in a single-orchestrator setting. Multi-
orchestrator coordination, information sharing, and trust federation are outside the scope of
this paper.
