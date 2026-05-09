# TRACE Paper — Reviewer Simulation

> Read from the perspective of a skeptical but fair systems workshop reviewer.
> Score: Accept / Weak Accept / Weak Reject / Reject (give rationale)

---

## Q1: What is the claimed contribution?

**Answer (as written in the paper):**
1. Empirical evaluation of composite trust routing in an adversarial agent marketplace, with
   statistically significant improvement over price-only and reputation-only baselines under
   collusion and strategic-default attacks.
2. Characterization of a scaling property: TRACE fraud exposure decreases consistently with
   network size under collusion.
3. Complexity-instability finding: two well-motivated extensions increase variance by 35% and
   reduce honest routing by 3 pp without statistically significant fraud reduction.

**Reviewer assessment:**
- Contribution 1 is solid but narrow (simulation-only, single-orchestrator).
- Contribution 2 is suggestive but limited to N ∈ {30, 50, 100}; headline claim should be
  "consistent with" not "demonstrates."
- Contribution 3 is the most novel and credible finding — a well-presented negative result
  with a mechanistic explanation (false-positive tax).

**Action:** Ensure abstract leads with contribution 3's framing, not contribution 1 alone.

---

## Q2: What evidence supports the contribution?

**Answer:**
- 614 total experiments, 20 seeds, Mann-Whitney U with Cliff's Delta
- Collusion ring + strategic default × N ∈ {30, 50, 100}
- 120-experiment version comparison (v2.1/v2.2/v2.3)

**Reviewer assessment:**
- 20 seeds is adequate for the observed effect sizes (large for baseline comparisons).
- Mann-Whitney U is appropriate; reasoning is in §6.
- Ablation estimates are single-seed — this must be labeled clearly. ✅ (already done)
- Sensitivity analysis uses only 5 seeds — must be labeled clearly. ✅ (title says "5 seeds")

**Action:** None critical. Confirm ablation caveat visible in figure and text.

---

## Q3: What is novel?

**Potential reviewer objection:** EigenTrust and similar systems already do trust-based routing.

**Response in paper:**
- EigenTrust requires trusted seed nodes and global convergence; TRACE is local and seedless.
- No prior work evaluates composite trust routing in LLM agent marketplaces with Lightning
  payment settlement.
- The complexity-instability finding is a novel empirical contribution independent of the
  routing mechanism itself.

**Action:** Related work (§5) must explicitly state what TRACE does that EigenTrust/SybilGuard
do NOT. Current draft does this — verify it reads clearly.

---

## Q4: What are the limitations?

**Potential reviewer objection:** This is a simulation. Where's the real system?

**Response in paper (§4.7):**
- Simulation fidelity caveat: provider behavior parameterized but no live LLM inference.
- Single-orchestrator model.
- Scale range limited to N ≤ 100.
- Ablation estimates only.

**Action:** §4.7 exists in evaluation draft. Ensure it appears prominently, not buried.

---

## Q5: Is anything overclaimed?

**Audit results:**
| Claim | Overclaimed? | Fix |
|-------|-------------|-----|
| "reduces fraud by 73%" | ✅ specific and verified | — |
| "18× higher fraud [reputation vs TRACE]" | ✅ verified | — |
| "first empirical evaluation" | ⚠️ bold | → "to our knowledge, one of the first" |
| "proves scaling is structural" | ⚠️ → "consistent with" | ✅ fixed in draft v2 |
| ablation "+105% fraud" | ⚠️ estimated | ✅ labeled as estimated |
| "fundamental false-positive tax" | ⚠️ mechanistic claim | ✅ labeled as "hypothesized" |

---

## Q6: Is the paper clearly written?

**Structure:**
- Abstract → Problem → Design → Evaluation → Related Work → Conclusion
- Key takeaway blocks after each subsection ✅
- Figure captions explain what is plotted + what matters ✅
- Limitations section present ✅

**Weak points:**
- §4.4 (Ablation) should more prominently caveat the single-seed estimates in the body text,
  not just the figure title.
- §5 (Related Work) placeholder citations ([cite]) must be filled before submission.

---

## Q7: Would you accept this paper?

**As a systems workshop paper: Weak Accept → Accept**

Reasoning:
- Negative result on complexity-instability is genuinely informative and clearly supported.
- Statistical methodology is above the norm for workshop papers (non-parametric, effect sizes).
- Reproducibility package is thorough.
- Limitations are honest.
- Main weakness: simulation-only, limited scale range, ablation not multi-seed.

**Required before submission:**
1. Fill all `[cite]` placeholders in related work and methodology
2. Run full multi-seed ablation (or clearly defer to future work as already done)
3. Verify exact p-value and Cliff's delta for TRACE vs PRICE collusion from significance.csv
4. Page limit check for target venue
5. Anonymous review: confirm no self-identifying information in text or acknowledgments
