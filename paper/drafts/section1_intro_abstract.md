# TRACE Paper — Introduction + Abstract
# Draft v2 — 2026-05-09 (Polish pass: claim-calibrated, hype-removed)

---

## Abstract

Autonomous agent marketplaces — where software agents discover, contract, and settle payments
without human oversight — face a fundamental trust problem: providers have economic incentives to
misrepresent their reliability, and no centralized authority governs their behavior. We present
TRACE (Trust-Routed Agent Coordination Engine), a lightweight composite trust scoring system for
adversarial agent marketplaces settling payments over the Bitcoin Lightning Network. TRACE
integrates completion history, counterparty entropy diversity, repeated-pair interaction decay, and
Sybil-resistance mechanisms into a routing utility that balances service quality, price, and
behavioral risk. We evaluate TRACE against reputation-only and price-only baselines under four
adversarial attack types across network scales N ∈ {30, 50, 100}, using 20-seed experiments with
Mann-Whitney U statistical testing and Cliff's Delta effect-size measurement. Under collusion ring
attack, TRACE reduces malicious routing share by 74.7 percentage points versus price-based routing
(p < 0.01, Cliff's δ = 0.71). Under strategic-default attack, reputation-only routing exposes
approximately 18× more fraud than TRACE, which is the only evaluated baseline that constrains
strategic-default effectively. We additionally evaluate two architectural extensions — adaptive
scale-aware penalties (v2.2) and temporal trust dynamics (v2.3) — and find that neither produces
statistically significant improvement over the baseline system. Fraud variance increases
monotonically with extension complexity (σ: 22.8 → 24.2 → 30.8 sats), and honest-agent routing
share decreases by 3 percentage points under both extensions. These results suggest that, under
medium-scale adversarial conditions, additional detection sophistication can introduce false-positive
instability that harms overall routing robustness.

---

## 1. Introduction

Decentralized agent marketplaces — in which software providers autonomously accept jobs, negotiate
prices, and settle Lightning Network payments — require trust mechanisms that function without
centralized authority or persistent identity. Unlike traditional service markets, entries are
permissionless: any entity can register as a provider, creating strong adversarial incentives.
Malicious providers may misrepresent reliability to extract payment, coordinate synthetically to
manipulate reputation signals, or exploit accumulated trust to selectively default on high-value
jobs. Routing decisions made under these conditions carry direct economic consequences, making
adversarial robustness a system requirement rather than a secondary consideration.

Two natural routing strategies fail systematically under adversarial conditions. Price-only routing
selects the cheapest available provider without consulting history, offering no defense against
reputation-based attacks: under collusion ring attack (N=50, 30% malicious, 20 seeds), price-only
routing routes 77% of jobs to malicious agents. Reputation-only routing, which selects the
highest-cumulative-success-rate provider, reduces collusion exposure effectively (9.7% malicious
routing) but is structurally blind to strategic default: agents that build legitimate histories
before selectively defaulting produce more than 18× the fraud exposure of TRACE under identical
conditions. Neither baseline provides robustness across the full attack landscape.

We present TRACE, a composite trust-based routing system designed to address both structural
(collusion, Sybil) and behavioral (strategic default, whitewashing) adversarial patterns
simultaneously. TRACE computes a provider trust score from six observable factors — completion
history, repayment rate, estimated default probability, counterparty entropy, Sybil risk, and
repeated-pair interaction concentration — and combines them into a routing utility that balances
quality, price, and behavioral risk. The system is local to the orchestrator, requiring no external
oracle, no cross-orchestrator state, and no modification to provider internals. It is fully
interpretable: every routing decision decomposes into its four contributing utility terms.

This paper makes three contributions. First, we present an empirical evaluation of composite trust
routing in an adversarial agent marketplace, establishing statistically significant improvement
over price-only and reputation-only baselines under collusion and strategic-default attacks across
three network scales. Second, we characterize a scaling property of diversity-weighted routing:
TRACE fraud exposure under collusion decreases consistently with network size, reflecting the
structural cost imposed on colluders by increasingly diverse honest-agent populations. Third, we
report a complexity-instability finding with broader methodological implications: two architectural
extensions that are well-motivated in theory — adaptive scale-aware penalties and temporal trust
dynamics — increase fraud variance by up to 35% and reduce honest-agent routing share by
3 percentage points, without statistically significant improvement in central fraud tendency (0/30
tests, p < 0.05). This finding suggests that heuristic detection mechanisms incur a false-positive
tax at medium network scales, and that trust system extensions require rigorous empirical validation
before adoption.

---

## 2. Problem Formulation

### 2.1 Agent Marketplace Model

We model an agent marketplace as a tuple (O, P, J, T) where O is an orchestrator, P = {p₁, …, pₙ}
is a set of provider agents, J is a stream of task requests with per-job value vⱼ (in sats), and
T is a trust state updated after each interaction outcome. The orchestrator selects a provider
π(j) ∈ P for each job j to maximize expected net value over the experiment horizon.

Each provider pᵢ has a private type θᵢ ∈ {honest, malicious}. Honest providers complete assigned
jobs with probability c̃ᵢ ∈ (0,1] drawn from their model type. Malicious providers may deviate
from the contract — defaulting on payment, routing jobs to co-conspirators, or registering
additional identities — to maximize private extraction. The orchestrator observes only outcomes
(completed / defaulted, invoice settled / not), not types directly.

### 2.2 Trust Problem

The trust problem is to maintain a belief state B(t) = {bᵢ(t)} over provider types such that
routing decisions π(j) under B(t) limit fraud exposure and maximize task completion in the
presence of adversarially behaving agents. We identify four attack surfaces:
(1) direct per-transaction fraud (strategic default),
(2) reputation signal manipulation (collusion rings),
(3) identity farming for routing share (Sybil clusters),
(4) reputation escape via identity reset (whitewashing).
A robust routing system must provide meaningful resistance to all four without requiring
information beyond observable transaction outcomes.
