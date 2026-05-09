# TRACE Paper — Figure Captions
# For inclusion in the paper body (copy-paste ready)

---

**Figure 1.** TRACE system architecture. The orchestrator selects a provider for each incoming
task by querying the Provider Registry, computing trust scores via the TRACE Scorer, and
evaluating routing utility. Providers execute tasks and receive Lightning payment upon delivery.
Outcomes are recorded in the Economic Ledger and fed back to the Trust Updater, which updates
TRACE scores for subsequent routing decisions. All computation is local to the orchestrator.

---

**Figure 2.** Adversarial threat model definitions. Each attack type exploits a distinct
structural vulnerability: collusion rings inflate trust via synthetic endorsements, strategic
defaulters exploit accumulated history, Sybil clusters dominate routing share via identity
volume, and whitewashers escape penalties via identity reset. TRACE addresses all four through
complementary scoring dimensions.

---

**Figure 3.** Fraud exposure versus network scale under collusion ring attack (30% malicious
agents, 20 seeds). TRACE fraud exposure decreases consistently as N increases, consistent with
the diversity-weighted routing mechanism that raises the structural cost of collusion in larger
honest-agent populations. Price-only routing remains substantially higher across all scales.
Shaded bands denote ±1 standard deviation across 20 seeds.

---

**Figure 4.** Ablation study: contribution of individual TRACE v2.1 mechanisms under collusion
ring attack (N=50). Removing repeated-pair decay or the clique penalty individually increases
fraud exposure by approximately 105% and 49% respectively; removing both produces a larger
combined increase (~257%), consistent with the two mechanisms addressing complementary structural
dimensions of collusion at the pairwise and network level respectively. Values are estimated from
limited seeds; a full multi-seed ablation is identified as future work.

---

**Figure 5.** Complexity versus stability across TRACE versions (collusion ring attack, N=50,
20 seeds). (a) All three versions produce statistically indistinguishable mean fraud (0/10 tests
p < 0.05). (b) Fraud standard deviation increases monotonically with version complexity, rising
35% from v2.1 to v2.3. (c) Honest-agent routing share decreases 3 percentage points under both
extensions relative to v2.1. These results indicate that the extensions increase tail risk and
false suppression without improving central fraud tendency under the evaluated conditions.

---

**Figure 6.** Honest-agent routing share by TRACE version (collusion ring attack, N=50, 20
seeds). The 3 percentage-point reduction under v2.2 and v2.3 relative to v2.1 reflects the
false-positive tax imposed by additional heuristic penalties on honest agents. Error bars denote
±1 standard deviation across 20 seeds.

---

**Figure 7.** Sensitivity analysis: relative change in fraud exposure under independent
perturbation of three TRACE v2.1 hyperparameters (collusion ring attack, N=50, 5 seeds). No
perturbation produces catastrophic failure. The decay rate parameter (λ) shows the highest
sensitivity (±18% fraud change at ±50% perturbation), consistent with repeated-pair decay being
the strongest ablation component. The entropy weight and clique threshold show low sensitivity
(< 12% change at ±25% perturbation), indicating TRACE v2.1 does not require precise parameter
calibration.
