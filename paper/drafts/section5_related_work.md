# TRACE Paper — Section 5: Related Work
# Draft v1 — 2026-05-09

---

## 5. Related Work

### Distributed Trust and Reputation Systems

The foundational work on computational trust in distributed systems is EigenTrust [Kamvar et al., 2003], which computes global trust values using the eigenvector of a normalized trust matrix — analogous to PageRank applied to peer-to-peer networks. EigenTrust demonstrates that trust transitivity can be exploited to reduce malicious activity in file-sharing networks. TRACE differs in two key respects: (1) trust computation is local to the orchestrator with no global convergence requirement, and (2) TRACE explicitly models adversarial collusion through structural penalties rather than relying on transitivity from pre-trusted seed nodes.

PeerTrust [Xiong and Liu, 2004] extends reputation models with context-sensitive weighting and transaction frequency factors, recognizing that trust is heterogeneous across interaction types. TRACE inherits this insight in its EMA-based completion rate weighting, which up-weights recent interactions over historical averages.

### Sybil Attack Defenses

SybilGuard [Yu et al., 2006] and SybilLimit [Yu et al., 2008] exploit the social graph structure of human trust networks to bound Sybil attack effectiveness — malicious identities cannot establish sufficient social connections to appear legitimate. These approaches require a pre-existing trusted social graph, which is unavailable in permissionless agent marketplaces where any entity can register a provider identity. TRACE addresses Sybil resistance through the progressive unlock mechanism: trust accumulation requires sustained successful interaction volume, making identity farming economically costly in proportion to the number of fake identities maintained.

### Marketplace Routing

Work on multi-agent routing under adversarial conditions spans both game-theoretic [cite: mechanism design] and empirical [cite: empirical marketplace security] traditions. Closest to our setting is the literature on Byzantine-fault-tolerant service selection [cite], which studies routing under arbitrary provider misbehavior. Most existing work assumes discrete, observable failures rather than strategic deception — an agent either delivers or it does not. Strategic default [cite] — where agents selectively default on high-value interactions after establishing reputation — has received less formal treatment. TRACE's per-transaction risk modeling directly addresses this gap.

### Trust in Autonomous Agent Ecosystems

The emergence of large language model agents as economic actors has generated nascent interest in trust mechanisms for AI marketplaces. Systems such as the Anthropic Model Context Protocol (MCP) [cite] and LangChain agent frameworks provide coordination infrastructure but rely on human-specified trust configurations rather than learned or dynamic trust models. TRACE contributes an empirically validated, lightweight trust layer that can be integrated with such frameworks without requiring changes to underlying agent implementations.

Recent work on AI agent safety [cite] has explored adversarial robustness in multi-agent environments, primarily through adversarial training and red-teaming. Our contribution is complementary: rather than making individual agents more robust, TRACE makes the routing layer resistant to adversarial agents, requiring no modification to provider agent internals.

### Economic Trust in Lightning Network

The Lightning Network [Poon and Dryja, 2016] provides the payment rail for TRACE's economic interactions. Trust modeling in payment channel networks has focused primarily on routing path reliability [cite] and channel liquidity management [cite]. TRACE addresses a distinct problem: provider trust for task allocation, not payment routing trust for Lightning channel selection. The combination of Lightning-settled payments with behavioral trust modeling is, to our knowledge, novel in the agent marketplace context.
