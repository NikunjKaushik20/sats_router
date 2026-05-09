# TRACE Paper — Reviewer Notes
# Weak points to address before submission

## High Priority

### 1. TRACE vs Reputation collusion: NOT significant (p=0.052)
**Problem:** Draft v1 implied TRACE is better than Reputation under collusion. It is not
statistically distinguishable at N=50. The result is borderline (medium effect, p=0.052).
**Fix:** ✅ Applied in §4.3 v2 — now explicitly states "does not reach conventional significance."
**Action:** Ensure intro and abstract do not claim collusion superiority over Reputation.

### 2. Strategic-default "18×" claim was wrong
**Problem:** Original draft claimed "18× higher fraud [REPUTATION vs TRACE]" — actual ratio
from master_results.csv is 1.5× (21.2 / 14.1). The "18×" came from an earlier unpopulated
draft estimate.
**Fix:** ✅ Applied in §4.3 v2 — corrected to verified numbers.
**Action:** Check abstract — remove "18×" if it appears there.

### 3. Malicious routing rate numbers corrected
**Problem:** Draft stated "18.3% malicious routing" and "77.0% for PRICE". Verified:
- TRACE collusion N=50: 21.4% (not 18.3%)
- PRICE collusion N=50: 57.4% (not 77.0%)
- REPUTATION collusion N=50: 19.8%
**Fix:** ✅ §4.3 now uses fraud exposure sats as primary metric (more precisely computed).
**Action:** Update Table 4 values to match these verified figures.

### 4. Abstract still uses old numbers
**Problem:** Abstract references "73% fraud reduction vs price-based routing" and "18×."
These are not from verified data.
**Fix needed:** Recompute:
  - TRACE fraud 43.8 vs PRICE 116.0 → reduction = (116.0-43.8)/116.0 = 62.2%
  - Use 62% as the verified figure.
  - Remove 18× entirely; replace with "higher malicious routing rate under strategic default."

### 5. Ablation is estimated only
**Status:** ✅ Labeled in Fig 4 title and §4.4 text.
**Action:** Ensure table caption also notes "estimated."

---

## Medium Priority

### 6. [cite] placeholders in §5.3 (marketplace routing, Byzantine)
**Status:** ✅ Resolved — see citation_tracker.md.
**Action:** Replace in next draft pass: Nisan 2007, Malkhi 1997, Dellarocas 2003.

### 7. Version comparison CSV column naming inconsistency
**Problem:** v2.1/v2.2/v2.3 rows not found by policy field lookup in stats script.
Stats sourced from version_comparison.csv pre-computed values instead.
**Status:** Pre-computed values are consistent and match VALIDATION_RESULTS.md.
**Action:** Document this in reproducibility README.

### 8. Transition between §4.5 (Complexity) and §4.6 (Sensitivity) is abrupt
**Fix:** Add one bridging sentence: "Having established that v2.1 is the optimal complexity
point within the evaluated range, we now characterize its parameter sensitivity."

---

## Low Priority / Before Final PDF

### 9. Table 4, Table 6, Table 8 values
Must be populated with the verified numbers from master_results.csv before PDF generation.

### 10. Figure 2 (threat models) table column widths
May be too narrow for 2-column format. Consider abbreviating "Adversarial Behavior" column.

### 11. Anonymous submission check
Remove any identifying information (institution names, repo URLs) for double-blind venues.

### 12. Page limit check
Target venue-specific page limit unknown. Current draft: ~9 pages of text + 7 figures.
Likely need to move sensitivity analysis or ablation detail to appendix for 8-page venues.

---

## Summary: Required Before Submission

| Item | Status |
|------|--------|
| Fix abstract "73%" → "62%" | ❌ TODO |
| Fix abstract "18×" removal | ❌ TODO |
| Verified stats in §4.3 | ✅ Done |
| [cite] placeholders resolved | ✅ Done |
| §4.7 Limitations | ✅ Done |
| Claims registry | ✅ Done |
| statistical_summary.csv | ✅ Done |
| Differentiation table (Tbl 5.1) | ✅ Done |
| Contributions.md | ✅ Done |
| BibTeX references | ✅ Done |
| Submission git branch | ❌ TODO |
| Conference template applied | ❌ TODO |
| Anonymous check | ❌ TODO |
