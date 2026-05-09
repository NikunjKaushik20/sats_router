# TRACE Paper — Section 4: Evaluation
# Draft v1 — 2026-05-09

---

## 4.1 Threat Models

We evaluate TRACE under four adversarial attack profiles that represent the principal economic threats in autonomous AI agent marketplaces.

**Collusion Ring.** A subset of malicious agents form a coordinated coalition that mutually endorses each other's service quality through synthetic successful transactions. The goal is to inflate TRACE scores artificially, enabling the ring to attract legitimate job routing despite low true reliability. Colluders accept jobs assigned to coalition members and report success even when service is not genuinely rendered. At N=50 with 30% malicious agents, 15 colluders execute up to 16 coordinated endorsement actions per round.

**Strategic Default.** Malicious agents build legitimate trust histories across multiple rounds, then selectively default on high-value jobs — accepting payment via Lightning invoice but failing to deliver the contracted service. Unlike collusion, strategic defaulters do not coordinate; each acts individually to maximize per-transaction extraction. This attack exploits systems that rely exclusively on cumulative reputation without per-transaction risk modeling.

**Sybil Cluster.** A single adversarial entity creates multiple distinct provider identities that collectively build trust through shared interactions. The cluster exploits identity permissiveness to dominate routing share through volume rather than merit. Individual Sybil nodes appear legitimate in isolation; only the cluster-level routing concentration reveals the attack.

**Whitewashing.** Malicious agents periodically reset their provider identity when TRACE scores fall below viability thresholds, escaping accumulated trust penalties. This attack is particularly effective against systems that cannot detect identity continuity across re-registration events.

---

## 4.2 Experimental Setup

We simulate an autonomous AI agent marketplace with N ∈ {30, 50, 100} provider agents drawn from three LLM archetypes: GPT-4o Mini (8–18 sats/job), Sarvam AI (5–12 sats/job), and Llama 3.2 3B (3–8 sats/job), distributed approximately equally. Each experiment runs 60 rounds of 5 jobs each (300 total), with 30% of agents designated as malicious from initialization. Malicious agents execute attack-specific behaviors each round.

We evaluate three routing policies:
- **TRACE** — our composite trust-based router (v2.1, feature flags disabled for adaptive/causal/temporal extensions)
- **REPUTATION** — routes to the highest cumulative success rate agent
- **PRICE** — routes to the lowest-cost available agent

All multi-seed experiments use 20 independent random seeds (1–20), providing sufficient statistical power for Mann-Whitney U tests (α = 0.05). Results are reported as mean ± standard deviation across seeds. Effect sizes are measured using Cliff's Delta, a non-parametric estimator robust to non-normal distributions.

Primary metrics:
- **Fraud exposure** (sats): total economic loss from successful fraudulent transactions
- **Malicious routing rate**: fraction of jobs routed to malicious agents
- **Success rate**: fraction of jobs completing successfully
- **Recovery time**: rounds until post-attack success rate recovers to pre-attack level

---

## 4.3 Core Routing Results

Table 4 presents the primary results under collusion ring attack. TRACE reduces malicious routing to 18.3% (N=50) compared to 77.0% for PRICE-only routing — a 74.7 percentage-point reduction (p < 0.01, Cliff's δ = 0.71, large). Against REPUTATION, TRACE achieves comparable fraud reduction while providing substantially stronger defense against strategic default (Table 4b).

The REPUTATION baseline performs well under collusion (9.7% malicious routing, N=50) because cumulative success rates naturally penalize colluders over time. However, REPUTATION offers no structural defense against strategic default: agents build legitimate histories and selectively default, resulting in over 380 sats fraud exposure per 300 jobs — more than 18× TRACE's exposure (13.0 ± 14.1 sats, p < 0.001). PRICE routing, which ignores history entirely, is catastrophically vulnerable to both attack types.

**Scaling behavior.** TRACE fraud exposure decreases monotonically with network scale: 84 sats (N=30) → 38 sats (N=50) → 22 sats (N=100) under collusion (Figure 3). This reflects TRACE's counterparty diversity requirement — larger networks provide more honest alternatives, making it increasingly costly for colluders to sustain inflated routing share. The scaling behavior is a structural property of the diversity-weighted routing mechanism.

---

## 4.4 Ablation Analysis

We evaluate the contribution of individual TRACE v2.1 components through targeted removal experiments (Table 6). All ablations use collusion ring attack at N=50 over 20 seeds.

**Repeated-pair decay** is the strongest individual component. Its removal increases fraud exposure by approximately 105% (41.5 → ~85 sats) and malicious routing rate from 20% to ~38%. The mechanism penalizes routing pairs that appear repeatedly — a pattern structurally characteristic of collusion rings — forcing exploration of new providers even when a coalition has inflated their TRACE scores.

**Clique penalty** contributes substantially but less critically, increasing fraud by ~49% when removed. It targets the low-diversity pattern at the network level rather than the pairwise level, catching colluders who spread synthetic endorsements across a closed subset of agents rather than a specific pair.

**Component synergy.** Removing both mechanisms simultaneously produces a 257% increase in fraud exposure — significantly more than the sum of individual effects. This superadditive interaction occurs because repeated-pair decay and clique penalty operate at different structural scales (pairwise vs. network-level), and sophisticated colluders exploit whichever dimension is unguarded. The synergy justifies retaining both components despite the modest individual complexity each adds.

---

## 4.5 Complexity-Induced Instability

This section presents a negative result with positive implications: increasing TRACE's architectural sophistication beyond the v2.1 baseline does not improve, and measurably harms, system robustness.

We evaluated two extensions:
- **v2.2**: Adaptive scale-aware penalties + causal graph failure tracking
- **v2.3**: v2.2 + temporal trust dynamics (velocity, reciprocal amplification, economic depth)

Table 8 summarizes the comparison across 120 experiments (3 versions × 2 attacks × 20 seeds). Under collusion ring attack, fraud variance increases monotonically with version complexity: v2.1 σ=22.84 → v2.2 σ=24.21 → v2.3 σ=30.82 — a 35% variance increase from baseline to maximum complexity. Honest routing share simultaneously decreases: 82% (v2.1) → 79% (v2.2/v2.3). v2.3 introduces two catastrophic outlier seeds (>98 sats fraud) versus one for v2.1.

Zero of thirty pairwise statistical tests reached significance (p < 0.05), confirming that all three versions are statistically indistinguishable in central tendency while differing meaningfully in tail behavior.

We attribute this pattern to a *false-positive tax* intrinsic to heuristic detection under constrained network conditions. At N=50 with 30% malicious agents, the network is dense enough that:
1. Adaptive scale-aware penalties at factor 0.5 aggressively penalize both malicious and honest agents
2. Causal graph failure tracking occasionally misidentifies honest agents adjacent to malicious ones as root-cause nodes
3. Temporal velocity analysis flags honest agents who grow quickly during the early learning phase

Each mechanism adds a marginal false-positive penalty on honest agents that cumulatively exceeds the marginal improvement in malicious detection. This finding aligns with theoretical results in adversarial detection [cite: precision-recall tradeoff literature] and motivates our selection of v2.1 as the paper system.

We note that these extensions may prove beneficial at significantly larger scales (N > 200) where the signal-to-noise ratio improves and heuristic penalties are amortized across a larger honest agent population. We leave this investigation to future work.

---

## 4.6 Sensitivity Analysis

TRACE v2.1 demonstrates graceful degradation under parameter perturbation (Table 7). We perturb each hyperparameter independently by ±25% and ±50% from its default value, measuring the resulting change in fraud exposure under collusion ring attack at N=50 (5 seeds).

No parameter perturbation causes catastrophic collapse. The counterparty entropy weight (w₄ = 0.20) shows the lowest sensitivity: ±25% perturbation produces <12% change in fraud exposure. The repeated-pair decay rate shows moderate sensitivity (±18% at ±50% perturbation), consistent with its status as the strongest ablation component. The clique penalty threshold shows low sensitivity (±8%), suggesting the mechanism is robust to threshold tuning.

Notably, malicious ratio sensitivity follows the expected pattern: reducing malicious agents to 20% cuts fraud by ~50%, while increasing to 40% increases fraud ~131%. This confirms the simulation is correctly modeling the attack intensity rather than an implementation artifact.

These results support the claim that TRACE v2.1's behavior is not contingent on precise parameter tuning — a necessary property for deployment in adversarial environments where system parameters may drift.
