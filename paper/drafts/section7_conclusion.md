# TRACE Paper — Section 7: Conclusion
# Draft v1 — 2026-05-09

---

## 7. Conclusion

We presented TRACE, a composite trust-based routing system for adversarial agent marketplaces,
and evaluated it against reputation-only and price-only baselines under four adversarial attack
types and three network scales. TRACE provides meaningful resistance to both collusion ring and
strategic-default attacks — the two attack types where existing baselines are structurally
weakest — while maintaining comparable performance on other dimensions.

The most practically significant finding is the **complexity-instability tradeoff**: two
architectural extensions that are well-motivated in theory do not improve, and measurably harm,
routing robustness under the evaluated conditions. Fraud variance increases monotonically with
extension complexity, honest-agent routing share decreases, and catastrophic-seed frequency
increases — all without statistically significant improvement in central fraud tendency. This
finding suggests that trust system designers face a genuine tradeoff between detection
sophistication and false-positive stability, particularly at medium network scales where heuristic
penalties affect honest agents with non-negligible frequency.

**Practical implications.** The v2.1 system — composite trust scoring with counterparty entropy,
repeated-pair decay, and clique detection — provides a defensible and reproducible baseline for
adversarial agent routing without requiring external coordination, identity infrastructure, or
modification to provider behavior. Its robustness under parameter perturbation (§4.6) suggests
it can be deployed without adversarial tuning.

**Future work.** Three directions emerge from this evaluation. First, characterizing the
scale-dependence of the complexity-instability tradeoff — specifically whether extensions become
net-positive at N > 200 — would clarify when additional sophistication is warranted. Second, a
full multi-orchestrator evaluation, where trust information is federated across orchestrators,
may substantially change both the effectiveness of collusion attacks and the detection mechanism
design space. Third, the ablation results are currently estimated rather than multi-seed validated;
a complete ablation study would strengthen the component-level claims.

---

## Acknowledgments

[Venue-appropriate acknowledgments to be added.]
