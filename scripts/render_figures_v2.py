"""
TRACE Paper — Figure Re-renderer
Polish pass: improved architecture diagram, SVG export, captions baked into filenames.
Run: python -X utf8 scripts/render_figures_v2.py
"""

import json, os
import numpy as np
import matplotlib as mpl
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.ticker import MaxNLocator

# ─── Global Style (identical to v1) ──────────────────────────────────────────
mpl.rcParams.update({
    "font.family":        "serif",
    "font.serif":         ["DejaVu Serif", "Times New Roman", "Palatino", "serif"],
    "font.size":          9,
    "axes.titlesize":     9,
    "axes.labelsize":     9,
    "xtick.labelsize":    8,
    "ytick.labelsize":    8,
    "legend.fontsize":    8,
    "legend.title_fontsize": 8,
    "lines.linewidth":    1.2,
    "lines.markersize":   4,
    "axes.spines.top":    False,
    "axes.spines.right":  False,
    "axes.linewidth":     0.8,
    "axes.grid":          True,
    "grid.linewidth":     0.4,
    "grid.color":         "#cccccc",
    "grid.alpha":         1.0,
    "axes.axisbelow":     True,
    "figure.facecolor":   "white",
    "axes.facecolor":     "white",
    "savefig.facecolor":  "white",
    "savefig.dpi":        300,
    "savefig.bbox":       "tight",
    "savefig.pad_inches": 0.05,
    "legend.frameon":     True,
    "legend.framealpha":  1.0,
    "legend.edgecolor":   "#cccccc",
    "legend.fancybox":    False,
    "pdf.fonttype": 42,
    "ps.fonttype":  42,
})

COLORS = {
    "TRACE":      "#4477AA",
    "REPUTATION": "#AA3377",
    "PRICE":      "#BBBBBB",
    "v2.1":       "#4477AA",
    "v2.2":       "#228833",
    "v2.3":       "#EE6677",
}
HATCHES = {
    "TRACE": "", "REPUTATION": "///", "PRICE": "xxx",
    "v2.1": "",  "v2.2": "///",       "v2.3": "xxx",
}

FIG_DIR = os.path.join(os.path.dirname(__file__), "..", "paper", "figures")

def load(name):
    with open(os.path.join(FIG_DIR, name)) as f:
        return json.load(f)

def save(fig, name):
    for ext in ["pdf", "png", "svg"]:
        fig.savefig(os.path.join(FIG_DIR, f"{name}.{ext}"))
    plt.close(fig)
    print(f"  [ok] {name}  (pdf + png + svg)")


# ─── Figure 1 (v2): Architecture — cleaner grid layout ───────────────────────

def fig1_architecture_v2():
    fig = plt.figure(figsize=(5.5, 3.2))
    ax = fig.add_axes([0, 0, 1, 1])
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 5.8)
    ax.set_axis_off()

    # Layer color bands (very subtle)
    ax.add_patch(mpatches.FancyBboxPatch((0.1, 4.5), 10.8, 1.0,
        boxstyle="round,pad=0.1", linewidth=0, facecolor="#F2F6FB", zorder=0))
    ax.add_patch(mpatches.FancyBboxPatch((0.1, 2.85), 10.8, 1.35,
        boxstyle="round,pad=0.1", linewidth=0, facecolor="#F7F7F7", zorder=0))
    ax.add_patch(mpatches.FancyBboxPatch((0.1, 0.2), 10.8, 2.35,
        boxstyle="round,pad=0.1", linewidth=0, facecolor="#F7F5FA", zorder=0))

    # Layer labels
    ax.text(0.35, 5.3, "Decision Layer", fontsize=6.5, color="#888888", style="italic", va="top")
    ax.text(0.35, 4.1, "Scoring Layer",  fontsize=6.5, color="#888888", style="italic", va="top")
    ax.text(0.35, 2.45, "Execution Layer", fontsize=6.5, color="#888888", style="italic", va="top")

    def box(cx, cy, w, h, label, sub="", fc="#EDF2F7", lw=0.7, bold=False):
        ax.add_patch(mpatches.FancyBboxPatch(
            (cx-w/2, cy-h/2), w, h,
            boxstyle="round,pad=0.08",
            linewidth=lw, edgecolor="#666666", facecolor=fc, zorder=2))
        fw = "bold" if bold else "normal"
        dy = 0.13 if sub else 0
        ax.text(cx, cy+dy, label, ha="center", va="center",
                fontsize=8, fontweight=fw, zorder=3)
        if sub:
            ax.text(cx, cy-0.17, sub, ha="center", va="center",
                    fontsize=6.5, color="#555555", zorder=3)

    def arr(x1, y1, x2, y2, lbl="", style="->", color="#444444"):
        ax.annotate("", xy=(x2,y2), xytext=(x1,y1),
            arrowprops=dict(arrowstyle=style, color=color,
                           lw=0.75, mutation_scale=8),
            zorder=4)
        if lbl:
            mx, my = (x1+x2)/2, (y1+y2)/2
            dx = 0.2 if x2 > x1 else -0.2
            ax.text(mx+dx, my+0.08, lbl, fontsize=6.5, color="#444444",
                    ha="center", va="bottom", zorder=5)

    # ── Nodes ──
    # Decision layer (top)
    box(5.5, 5.05, 3.2, 0.7, "Orchestrator", "Selects provider per task", fc="#DDEEFF", bold=True)

    # Scoring layer (middle)
    box(2.2, 3.45, 2.6, 0.65, "Provider Registry", "Agents + TRACE scores", fc="#EDF7ED")
    box(5.5, 3.45, 2.6, 0.65, "TRACE Scorer",      "6-factor composite",    fc="#FFF8E8")
    box(8.8, 3.45, 2.6, 0.65, "Routing Utility",   "Quality/price/risk",    fc="#EDF7ED")

    # Execution layer (bottom)
    box(2.2, 1.75, 2.6, 0.65, "Provider Agents",   "Execute + receive pay", fc="#F5EDF7")
    box(5.5, 1.75, 2.6, 0.65, "Trust Updater",     "Post-settlement update",fc="#FFF8E8")
    box(8.8, 1.75, 2.6, 0.65, "Economic Ledger",   "Records all outcomes",  fc="#F5EDF7")
    box(5.5, 0.55, 2.8, 0.55, "Lightning Settlement", "", fc="#F0F0F0")

    # ── Arrows ──
    # Orchestrator → Registry (query)
    arr(4.1, 4.7, 2.8, 3.78, "query")
    # Orchestrator → TRACE Scorer
    arr(5.5, 4.7, 5.5, 3.78)
    # Orchestrator → Routing Utility
    arr(6.9, 4.7, 8.2, 3.78, "utilities")
    # Registry → TRACE Scorer
    arr(3.5, 3.45, 4.2, 3.45, "scores")
    # Routing Utility → TRACE Scorer (feedback)
    arr(7.5, 3.45, 6.8, 3.45)
    # Registry → Provider Agents (select)
    arr(2.2, 3.12, 2.2, 2.08, "select")
    # Provider Agents → Trust Updater (outcome)
    arr(3.5, 1.75, 4.2, 1.75, "outcome")
    # Trust Updater → TRACE Scorer (update)
    arr(5.5, 2.08, 5.5, 3.12, "update")
    # Trust Updater → Lightning
    arr(5.5, 1.42, 5.5, 0.83)
    # Lightning → Economic Ledger
    arr(6.9, 0.55, 8.8, 1.42, "settle")
    # Economic Ledger → Trust Updater
    arr(7.5, 1.75, 6.8, 1.75)

    ax.set_title("Fig. 1 — TRACE System Architecture", fontsize=8.5, pad=4, y=0.99)
    save(fig, "fig1_architecture")


# ─── Figures 3–7: re-export with SVG ─────────────────────────────────────────
# (identical plot logic, just adds SVG output)

def fig3_scaling():
    data = load("fig3_scaling_fraud.json")["data"]
    policies = ["TRACE", "REPUTATION", "PRICE"]
    labels   = ["TRACE", "Reputation", "Price"]
    fig, ax = plt.subplots(figsize=(3.3, 2.4))
    markers = {"TRACE": "o", "REPUTATION": "s", "PRICE": "^"}
    ls = {"TRACE": "-", "REPUTATION": "--", "PRICE": ":"}
    for p, lbl in zip(policies, labels):
        pts = data[p]
        ns    = [x["n"]    for x in pts]
        means = [x["mean"] for x in pts]
        stds  = [x["std"]  for x in pts]
        ax.plot(ns, means, color=COLORS[p], marker=markers[p],
                linestyle=ls[p], label=lbl, zorder=3)
        ax.fill_between(ns,
            [m-s for m,s in zip(means,stds)],
            [m+s for m,s in zip(means,stds)],
            color=COLORS[p], alpha=0.12, linewidth=0)
    ax.set_xlabel("Network Size ($N$)")
    ax.set_ylabel("Fraud Exposure (sats)")
    ax.set_title("Fig. 3 \u2014 Fraud vs. Network Scale\n"
                 "(Collusion Ring, 30% malicious; shaded = +/-1 s.d., 20 seeds)", fontsize=8)
    ax.set_xticks([30, 50, 100])
    ax.yaxis.set_major_locator(MaxNLocator(integer=True, nbins=5))
    ax.legend(loc="upper right")
    ax.set_xlim(22, 108); ax.set_ylim(bottom=0)
    fig.tight_layout()
    save(fig, "fig3_scaling_fraud")

def fig4_ablation():
    data = load("fig4_ablation.json")["data"]
    short = ["Full\nTRACE v2.1", "- Repeated-\npair Decay", "- Clique\nPenalty", "- Both\nMechanisms"]
    values = [d["fraud"] for d in data]
    stds   = [d["std"]   for d in data]
    colors  = [COLORS["v2.1"], "#888888", "#888888", "#444444"]
    hatches = ["", "///", "xxx", "///"]
    x = np.arange(len(short))
    fig, ax = plt.subplots(figsize=(3.5, 2.6))
    bars = ax.bar(x, values, 0.55, color=colors, hatch=hatches,
                  edgecolor="black", linewidth=0.6, zorder=3)
    ax.errorbar(x, values, yerr=stds, fmt="none", color="black",
                capsize=3, linewidth=0.8, zorder=4)
    ax.set_xticks(x); ax.set_xticklabels(short, fontsize=7.5)
    ax.set_ylabel("Fraud Exposure (sats)")
    ax.set_title("Fig. 4 — Ablation Study\n"
                 "(Collusion Ring, $N$=50; values estimated, full ablation = future work)",
                 fontsize=7.5)
    ax.set_ylim(bottom=0)
    baseline = values[0]
    for i, (v, bar) in enumerate(zip(values, bars)):
        if i == 0: continue
        pct = (v - baseline) / baseline * 100
        ax.text(bar.get_x() + bar.get_width()/2, v + stds[i] + 4,
                f"+{pct:.0f}%", ha="center", fontsize=7, color="#333333")
    fig.tight_layout()
    save(fig, "fig4_ablation")

def fig5_complexity():
    data = load("fig5_complexity_stability.json")["data"]
    versions = ["v2.1", "v2.2", "v2.3"]
    x = np.arange(len(versions))
    fig, axes = plt.subplots(1, 3, figsize=(6.5, 2.4), sharey=False)

    # (a) Mean fraud
    ax = axes[0]
    means  = data["fraudMean"]
    sigmas = data["fraudSigma"]
    ax.bar(x, means, 0.55,
           color=[COLORS[v] for v in versions],
           hatch=[HATCHES[v] for v in versions],
           edgecolor="black", linewidth=0.6, zorder=3)
    ax.errorbar(x, means, yerr=sigmas,
                fmt="none", color="black", capsize=3, linewidth=0.8, zorder=4)
    ax.set_xticks(x); ax.set_xticklabels(versions)
    ax.set_ylabel("Fraud Exposure (sats)")
    ax.set_title("(a) Mean Fraud +/- s.d.", fontsize=8)
    ax.set_ylim(bottom=0)

    # (b) Variance
    ax = axes[1]
    ax.bar(x, sigmas, 0.55,
           color=[COLORS[v] for v in versions],
           hatch=[HATCHES[v] for v in versions],
           edgecolor="black", linewidth=0.6, zorder=3)
    ax.set_xticks(x); ax.set_xticklabels(versions)
    ax.set_ylabel("Fraud Std. Dev. (sats)")
    ax.set_title("(b) Fraud Variance", fontsize=8)
    ax.set_ylim(bottom=0)
    # Annotate 35% increase
    ax.annotate("", xy=(2, sigmas[2]), xytext=(0, sigmas[0]),
                arrowprops=dict(arrowstyle="->", color="#555555", lw=0.7,
                               connectionstyle="arc3,rad=-0.3"))
    ax.text(1.0, 28.5, "+35%", fontsize=7, color="#555555", ha="center")

    # (c) Honest routing
    ax = axes[2]
    honest = data["honestRouting"]
    ax.bar(x, honest, 0.55,
           color=[COLORS[v] for v in versions],
           hatch=[HATCHES[v] for v in versions],
           edgecolor="black", linewidth=0.6, zorder=3)
    ax.set_xticks(x); ax.set_xticklabels(versions)
    ax.set_ylabel("Honest Routing Share (%)")
    ax.set_title("(c) Honest Routing", fontsize=8)
    ax.set_ylim(70, 90)
    ax.axhline(honest[0], color=COLORS["v2.1"], linewidth=0.6,
               linestyle="--", alpha=0.5, zorder=1)

    fig.suptitle("Fig. 5 — Complexity vs. Stability  (Collusion Ring, $N$=50, 20 seeds)",
                 fontsize=8, y=1.01)
    fig.tight_layout()
    save(fig, "fig5_complexity_stability")

def fig6_suppression():
    data    = load("fig6_false_suppression.json")["data"]
    versions = [d["version"] for d in data]
    means    = [d["mean"]    for d in data]
    stds     = [d["std"]     for d in data]
    x = np.arange(len(versions))
    fig, ax = plt.subplots(figsize=(3.0, 2.4))
    ax.bar(x, means, 0.5,
           color=[COLORS[v] for v in versions],
           hatch=[HATCHES[v] for v in versions],
           edgecolor="black", linewidth=0.6, zorder=3)
    ax.errorbar(x, means, yerr=stds,
                fmt="none", color="black", capsize=3, linewidth=0.8, zorder=4)
    ax.annotate("", xy=(1, means[1]), xytext=(0, means[0]),
                arrowprops=dict(arrowstyle="->", color="#555555", lw=0.8))
    ax.text(0.55, (means[0]+means[1])/2 + 0.5, "-3 pp",
            fontsize=7, color="#555555", ha="center")
    ax.set_xticks(x); ax.set_xticklabels(["v2.1", "v2.2", "v2.3"])
    ax.set_ylabel("Honest Routing Share (%)")
    ax.set_title("Fig. 6 \u2014 Honest Routing by Version\n"
                 "(Collusion Ring, $N$=50, 20 seeds; error bars = +/-1 s.d.)", fontsize=8)
    ax.set_ylim(60, 100)
    fig.tight_layout()
    save(fig, "fig6_false_suppression")

def fig7_sensitivity():
    data = load("fig7_sensitivity.json")["parameters"]
    fig, ax = plt.subplots(figsize=(3.5, 2.6))
    styles = ["-o", "--s", ":^"]
    labels = ["Entropy weight ($w_4$)", "Decay rate ($\\lambda$)", "Clique threshold ($\\theta$)"]
    colors = [COLORS["v2.1"], COLORS["v2.2"], COLORS["v2.3"]]
    for p, ls, lbl, col in zip(data, styles, labels, colors):
        ax.plot(p["perturbations"], p["impacts"],
                ls, color=col, label=lbl, markersize=4, zorder=3)
    ax.axhline(0, color="black", linewidth=0.6, linestyle="--", zorder=2)
    ax.axvline(0, color="#cccccc", linewidth=0.5, zorder=1)
    ax.set_xlabel("Parameter Perturbation (%)")
    ax.set_ylabel("Relative Fraud Change (%)")
    ax.set_title("Fig. 7 — Sensitivity Analysis\n"
                 "(Collusion Ring, $N$=50, 5 seeds)", fontsize=8)
    ax.legend(loc="upper left", fontsize=7)
    ax.set_xticks([-50, -25, 0, 25, 50])
    fig.tight_layout()
    save(fig, "fig7_sensitivity")

def fig2_threat_models():
    attacks = load("fig2_threat_models.json")["attacks"]
    fig, ax = plt.subplots(figsize=(5.5, 1.9))
    ax.set_axis_off()
    rows_data = [[a["name"], a["behavior"], a["target"], a["indicator"]] for a in attacks]
    col_labels = ["Attack", "Adversarial Behavior", "Economic Goal", "Detection Signal"]
    tbl = ax.table(cellText=rows_data, colLabels=col_labels,
                   loc="center", cellLoc="left")
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(8)
    tbl.auto_set_column_width(col=list(range(len(col_labels))))
    for (row, col), cell in tbl.get_celld().items():
        cell.set_edgecolor("#cccccc")
        cell.set_linewidth(0.5)
        if row == 0:
            cell.set_facecolor("#F0F0F0")
            cell.set_text_props(weight="bold")
        else:
            cell.set_facecolor("white")
    ax.set_title("Fig. 2 — Adversarial Threat Models", fontsize=8, pad=8)
    fig.tight_layout()
    save(fig, "fig2_threat_models")


# ─── Run All ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Rendering figures (v2: SVG + caption notes + improved architecture)...")
    fig1_architecture_v2()
    fig2_threat_models()
    fig3_scaling()
    fig4_ablation()
    fig5_complexity()
    fig6_suppression()
    fig7_sensitivity()
    print("\nDone. paper/figures/ -> pdf + png + svg")
