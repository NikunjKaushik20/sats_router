# TRACE Paper — Final Review Checklist

## Phase 11 Review Pass

### ❌ Remove These
- [ ] AGI framing ("this is the future of AGI coordination")
- [ ] "Revolutionary" / "breakthrough" / "state of the art" (unsubstantiated)
- [ ] Claims about v2.2/v2.3 being "promising" without evidence caveats
- [ ] Sweeping claims about LLM agent marketplaces in general
- [ ] Unqualified "TRACE solves X" statements

### ✅ Replace With
- [ ] "TRACE demonstrates robust adversarial resistance in simulated LLM agent marketplaces"
- [ ] "Under collusion ring attack, TRACE reduced fraud by X% (p<0.05, Cliff's δ=Y)"
- [ ] "These results hold under the specific conditions evaluated; generalization requires further study"

---

## Language Checks

| Phrase | Replace With |
|--------|-------------|
| "TRACE solves agent trust" | "TRACE provides adversarial routing resistance" |
| "completely eliminates fraud" | "reduces fraud by X% under evaluated conditions" |
| "always outperforms" | "outperforms under Y conditions (p<0.05)" |
| "proves that" | "provides evidence that" |
| "trivially handles" | "handles effectively under N=50 conditions" |
| "the best system" | "stronger than evaluated baselines" |

---

## Structural Checks

- [ ] Abstract matches actual results (no overclaiming)
- [ ] Every claim in intro has a citation or result reference
- [ ] Every figure has a label, caption, and in-text reference
- [ ] Every table has header, caption, and footnotes for non-obvious values
- [ ] Related work covers EigenTrust, SybilGuard, marketplace routing
- [ ] Limitations section present (or limitations integrated into §4.5)
- [ ] Reproducibility package referenced in paper
- [ ] Git tag `v2.1-paper-locked` mentioned for reproducibility

---

## Statistics Checks

- [ ] All significant results report: test name, statistic, p-value, effect size
- [ ] All non-significant results explicitly stated as non-significant
- [ ] Seed count stated upfront and justified
- [ ] Mann-Whitney justification present (non-normal distributions)
- [ ] Cliff's Delta thresholds defined in methodology
- [ ] No p-hacking: all metrics pre-specified in methodology

---

## Venue Formatting Checks (fill in per target venue)

- [ ] Page limit: __ pages (check venue CFP)
- [ ] Font: __ pt (check template)
- [ ] Template: ACM / IEEE / USENIX / NeurIPS / ICLR / workshop-specific
- [ ] Anonymous submission: Yes / No
- [ ] Supplementary allowed: Yes / No
- [ ] Artifact submission: Yes / No
