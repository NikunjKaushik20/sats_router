# TRACE Paper — Introduction + Abstract
# Draft v1 — 2026-05-09
# NOTE: Written AFTER results section. Revised to match evidence precisely.

---

## Abstract

Autonomous AI agent marketplaces — where software agents discover, contract, and settle payments with each other without human intervention — face a fundamental trust problem: providers have economic incentives to misrepresent their reliability, and no centralized authority governs their behavior. We present TRACE (Trust-Routed Agent Coordination Engine), a lightweight composite trust scoring system for adversarial AI agent marketplaces operating over the Bitcoin Lightning Network. TRACE integrates completion history, counterparty entropy diversity, repeated-pair interaction decay, and Sybil-resistance mechanisms into a unified routing utility. We evaluate TRACE against reputation-only and price-only baselines under four adversarial attack types across network scales of N ∈ {30, 50, 100} agents using 20-seed multi-seed experiments with Mann-Whitney statistical testing. TRACE reduces fraud exposure by 73% versus price-based routing under collusion attacks and uniquely maintains robustness under strategic-default attacks where reputation-only systems suffer catastrophic failure (18× higher fraud exposure). We additionally report a complexity-instability finding: two proposed architectural extensions (adaptive scaling and temporal trust dynamics) increase fraud variance by up to 35% and reduce honest agent routing share by 3 percentage points versus the baseline system, without statistically significant improvement in central fraud tendency. These results suggest that adversarial trust systems require careful calibration of detection sophistication against false-positive stability.

---

## 1. Introduction

### Paragraph 1 — Problem

The emergence of large language model (LLM) agents capable of autonomously executing multi-step tasks has enabled a new class of economic actor: software providers that accept jobs, negotiate prices, and receive payments without human intervention. In Lightning Network-enabled agent marketplaces, these interactions are settled via cryptographic payment channels at sub-second latency, enabling micro-transaction-scale coordination at scale. However, the permissionless nature of such marketplaces — where any entity can register as a provider — creates a fundamental adversarial trust problem. Malicious providers have strong economic incentives to misrepresent their reliability, coordinate with other malicious actors to manipulate reputation signals, or exploit established trust to extract payments without delivering service.

### Paragraph 2 — Limitations of Existing Approaches

Two simple routing strategies fail systematically under adversarial conditions. **Price-only routing** selects the cheapest available provider regardless of history — offering zero defense against any reputation-based attack (77% malicious routing rate under collusion, N=50). **Reputation-only routing** accumulates success rate history and selects the highest-rated provider — effective against collusion (9.7% malicious routing) but catastrophically vulnerable to strategic default, where agents build legitimate reputation before selectively defaulting on high-value jobs (>380 sats fraud per 300 jobs versus 13 sats for TRACE). Neither baseline provides the combination of structural pattern detection and per-transaction risk modeling required for robustness across the attack landscape.

### Paragraph 3 — TRACE Overview

We propose TRACE, a composite trust-based routing system that addresses both structural and behavioral adversarial patterns. TRACE computes a provider trust score integrating six factors: completion history, repayment rate, estimated default probability, counterparty diversity (Shannon entropy), Sybil risk, and repeated-pair interaction concentration. These are combined into a routing utility that balances service quality, price, risk, and network diversity. Crucially, TRACE applies decreasing marginal trust credit to repeated interactions between the same pair of agents — penalizing the collusion-characteristic pattern of mutual endorsement — and requires minimum diversity thresholds before agents can reach high trust tiers. The system requires no external oracle, no cross-orchestrator coordination, and no modification to provider agent internals.

### Paragraph 4 — Contributions and Findings

This paper makes three principal contributions. First, we provide the first empirical evaluation of composite trust routing in an adversarial LLM agent marketplace, demonstrating statistically significant improvement over both price-only and reputation-only baselines across four attack types and three network scales. Second, we quantify the scaling properties of trust-based routing: TRACE fraud exposure decreases monotonically with network size (84→38→22 sats as N grows from 30 to 100), a structural property of diversity-weighted routing in larger honest-agent populations. Third, and perhaps most importantly, we report a complexity-instability finding: more sophisticated architectural extensions (adaptive scale-aware penalties and temporal trust dynamics) increase system variance and reduce honest agent utilization without statistically significant fraud reduction, suggesting a fundamental false-positive tax on heuristic detection under constrained network conditions. This finding motivates careful empirical validation before deploying trust mechanism extensions, even when they are theoretically well-motivated.

---

## 2. Problem Formulation

### 2.1 Agent Marketplace Model

We model an autonomous agent marketplace as a tuple (O, P, J, T) where O is an orchestrator agent, P = {p₁, ..., pₙ} is a set of provider agents, J is a stream of task requests with associated value vⱼ sats, and T is a trust state updated after each interaction. The orchestrator selects a provider π(j) ∈ P for each job j to maximize expected net value across the horizon.

Each provider pᵢ has a private type θᵢ ∈ {honest, malicious}. Honest providers complete assigned jobs with probability c̃ᵢ ∈ (0,1] drawn from their model capabilities. Malicious providers may deviate from the contract — defaulting on payment, routing jobs to co-conspirators, or generating fake identities — to maximize private extraction at the cost of platform welfare.

### 2.2 Trust Problem

The orchestrator observes only outcomes (job completed / defaulted, invoice settled / not), not types. The trust problem is to maintain a belief state B(t) = {bᵢ(t)} over provider types such that routing decisions π(j) under B(t) minimize fraud exposure and maximize successful job completion in the presence of adversarially behaving agents.

This formulation admits four attack surfaces: (1) direct fraud (strategic default), (2) reputation manipulation (collusion), (3) identity farming (Sybil attacks), and (4) reputation reset (whitewashing). A robust trust system must handle all four simultaneously.
