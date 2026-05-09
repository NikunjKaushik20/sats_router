# TRACE Paper — Section 3: System Design
# Draft v1 — 2026-05-09

---

## 3.1 System Overview

TRACE (Trust-Routed Agent Coordination Engine) is a trust-based routing layer for autonomous AI agent marketplaces operating over the Bitcoin Lightning Network. The system coordinates three principal actors: an **orchestrator** that receives task requests and selects providers, a set of **provider agents** that execute tasks and receive payment, and an **economic trust ledger** that records interaction histories.

The routing loop operates as follows. Given an incoming task, the orchestrator queries all available providers and computes a **routing utility** for each, integrating price, estimated success probability, and trust-based risk penalties. The provider maximizing utility is selected and issued a Lightning payment conditional on task completion. Upon settlement, the provider's trust scores are updated based on actual performance. This feedback loop progressively differentiates reliable from unreliable agents without requiring centralized coordination or external identity verification.

All trust computation is local to the orchestrator: no external reputation oracle, no cross-orchestrator communication, and no persistent storage beyond the local interaction history. This design choice reflects the decentralized nature of Lightning Network marketplaces, where orchestrators may not share state with each other.

---

## 3.2 TRACE Score

Each provider agent maintains a **TRACE Score** S ∈ [0, 1000] computed as a weighted sum of six behavioral factors:

```
S = w₁·C + w₂·R + w₃·(1 - D) + w₄·E + w₅·(1 - Y) + w₆·(1 - X)
```

where:
- **C** = completion rate (historical job success fraction, EMA)
- **R** = repayment rate (fraction of Lightning invoices settled)
- **D** = default probability (estimated from recent failure patterns)
- **E** = counterparty entropy (routing diversity, Shannon H(p))
- **Y** = sybil risk (inverse of progressive-unlock trust level)
- **X** = repeated-pair score (normalized interaction concentration)

Default weights: w₁=0.25, w₂=0.20, w₃=0.30, w₄=0.15, w₅=0.05, w₆=0.05.

The weighting philosophy prioritizes economic reliability (w₁+w₂+w₃ = 0.75) over structural detection heuristics (w₄+w₅+w₆ = 0.25). This reflects the observation that genuine collusion ultimately manifests in economic behavior — colluders default and fail — not just structural patterns.

**Counterparty entropy** (E) measures the Shannon entropy of the provider's routing partner distribution. High entropy indicates diverse interactions; low entropy indicates concentration on a small set of counterparties, which is structurally characteristic of collusion rings. A minimum entropy threshold gates trust accumulation: agents with insufficient diversity cannot reach full TRACE scores regardless of raw performance metrics.

**Trust saturation** prevents indefinite score inflation. Scores approaching 900 grow progressively slower via a nonlinear saturation term, making it structurally expensive to reach the highest trust tier through fraudulent means alone.

---

## 3.3 Trust Graph and Clique Suppression

TRACE maintains a directed **interaction graph** G = (V, E) where vertices are agents and edges represent routing relationships weighted by interaction count and outcome. The graph serves two purposes: detecting concentrated routing patterns and applying **clique penalties**.

A **routing clique** is a densely connected subgraph where a small set of agents preferentially route to each other. Legitimate agents in large networks accumulate diverse interaction partners; colluding agents systematically concentrate on each other. The clique penalty applies a multiplicative suppression to TRACE scores when an agent's local routing concentration (measured by normalized edge weight entropy) falls below the threshold θ_clique = 0.40.

**Repeated-pair decay** operates at the edge level: each successive job between the same requestor-provider pair incurs an exponentially increasing penalty to the marginal trust contribution of that interaction:

```
decay(n) = exp(-λ · max(0, n - n_threshold))
```

where n is the number of observed interactions in the pair, n_threshold = 5 (interactions before decay activates), and λ = 0.15 (decay rate). This makes it geometrically costly for a colluding pair to inflate each other's scores through volume, since the 10th interaction contributes only e^{-0.75} ≈ 47% of the marginal trust of the 5th.

---

## 3.4 Routing Utility

The final routing decision selects the provider maximizing:

```
U(a) = α · quality(a) − β · price(a) − γ · risk(a) + δ · diversity(a)
```

where:
- **quality(a)** = estimated job completion probability given TRACE score
- **price(a)** = normalized job price (lower is better for orchestrator)
- **risk(a)** = estimated fraud probability (derived from TRACE score deficit from 1000)
- **diversity(a)** = bonus for routing to previously underutilized providers

Default coefficients: α=0.40, β=0.25, γ=0.30, δ=0.05.

The risk term dominates for agents with low TRACE scores — an agent with S=500 incurs a risk penalty of 0.15, sufficient to displace a cheaper but lower-trust alternative. The diversity bonus prevents degenerate solutions where the orchestrator repeatedly routes to a single high-trust agent regardless of network conditions, which would create fragility and concentrated attack surface.

This utility formulation preserves full interpretability: every routing decision can be decomposed into its four contributing factors, with the winning provider's advantage attributable to specific behavioral dimensions rather than an opaque learned preference.
