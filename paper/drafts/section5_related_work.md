# TRACE Paper — Section 5: Related Work
# Draft v2 — 2026-05-09 (Citations resolved, framing calibrated, differentiation table added)

---

## 5. Related Work

### 5.1 Distributed Trust and Reputation Systems

Trust computation in distributed systems has been studied extensively in the peer-to-peer context.
EigenTrust [Kamvar et al., 2003] computes a global trust vector as the principal eigenvector of a
normalized peer-interaction matrix, drawing on the PageRank intuition applied to trust
transitivity. EigenTrust demonstrates that structural trust propagation can substantially reduce
exposure to malicious peers in file-sharing networks. However, EigenTrust requires pre-designated
trusted seed nodes whose initial trust scores bootstrap the global computation — a requirement
unavailable in permissionless agent marketplaces. TRACE computes trust locally from directly
observed transaction outcomes, requiring no global convergence and no seed trust infrastructure.

PeerTrust [Xiong and Liu, 2004] extends reputation modeling with context-sensitive transaction
weighting and community context factors, recognizing that trust heterogeneity across interaction
types is not captured by flat cumulative scoring. TRACE inherits this insight: the EMA-based
completion rate preferentially weights recent interactions over historical ones, allowing TRACE
scores to adapt when provider behavior changes.

Both systems assume honest reporting of interaction outcomes — a condition that does not hold in
adversarial settings where colluders report synthetic successes. TRACE addresses this through
structural pattern detection rather than outcome reporting, penalizing interaction concentration
regardless of reported success rates.

### 5.2 Sybil Attack Defenses

SybilGuard [Yu et al., 2006] and SybilLimit [Yu et al., 2008] use the structure of human social
trust graphs to bound Sybil attack effectiveness: the intuition is that honest agents are
densely connected while malicious identities cannot acquire sufficient legitimate social
connections. These approaches have proven effective where a trusted social graph exists. In
permissionless agent marketplaces, no such pre-existing social structure is available — any
entity can register a provider identity. TRACE addresses Sybil resistance through a progressive
unlock mechanism: trust accumulates only through sustained successful transaction volume, making
identity farming economically costly proportional to the number of false identities maintained.
This provides Sybil resistance without requiring external identity infrastructure.

### 5.3 Adversarial Routing and Strategic Behavior

Routing under adversarial conditions has been studied in both game-theoretic [Nisan et al., 2007]
and systems [Malkhi and Reiter, 1997] traditions. Byzantine fault-tolerant protocols address
arbitrary node misbehavior, but assume observable failures: a Byzantine node either responds or
it does not. Strategic default — where agents selectively default on high-value jobs after
establishing legitimate reputation — constitutes a subtler adversarial pattern studied in the
context of online platform reputation [Dellarocas, 2003]. Dellarocas identifies that reputation
systems create incentives for strategic manipulation once sufficient trust capital is accumulated.
TRACE directly addresses this through per-transaction default probability estimation and decay
of trust credit for repeated interactions, rather than relying purely on cumulative history.

### 5.4 Trust in Agent Coordination Infrastructure

Recent agent coordination systems, including the Anthropic Model Context Protocol [Anthropic,
2024] and associated agent frameworks, provide standardized interfaces for tool discovery and
task delegation. These systems rely on human-specified trust configurations rather than dynamic,
adaptive trust models — appropriate for controlled deployment contexts but insufficient for open
adversarial marketplaces. TRACE provides a lightweight trust layer compatible with such
coordination infrastructure, requiring no changes to provider agent internals.

The emerging literature on adversarial robustness in multi-agent settings [Perez et al., 2022]
has focused primarily on prompt-level attacks against language models. Our contribution is
orthogonal: TRACE targets the routing layer, making the orchestrator's provider selection
resistant to adversarial agents without requiring modifications to agent internals or reasoning.

### 5.5 Trust in Lightning Network Payment Systems

The Lightning Network [Poon and Dryja, 2016] provides the payment settlement layer for TRACE's
economic interactions. Prior work on Lightning-layer trust has focused on routing path
reliability for payment channels [Sivaraman et al., 2020] and channel liquidity management —
essentially, which nodes can reliably forward payments. TRACE addresses a distinct layer:
provider trust for task allocation, not payment-path trust for channel routing. The combination
of Lightning-settled task payments with behavioral trust modeling for autonomous agent selection
is, to our knowledge, not addressed by prior systems work.

---

## Table 5.1 — TRACE vs. Prior Trust Systems

| System | Trust Propagation | Sybil Defense | Economic Routing | False Suppression Eval | Complexity Validation |
|--------|------------------|---------------|-----------------|----------------------|----------------------|
| EigenTrust [2003] | Global (eigenvector) | No | No | No | No |
| PeerTrust [2004] | Local + context | No | No | No | No |
| SybilGuard [2006] | Social graph | Yes | No | No | No |
| SybilLimit [2008] | Social graph | Yes (near-optimal) | No | No | No |
| **TRACE v2.1** | Local (composite) | Yes (progressive) | Yes | **Yes** | **Yes** |

Key differentiators: TRACE is the only evaluated system to (a) combine structural collusion
detection with per-transaction default risk modeling, (b) report false-suppression (honest-agent
penalty) explicitly, and (c) empirically validate the stability cost of architectural complexity
extensions.
