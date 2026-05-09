"""
TRACE Paper — Figure Renderer
Academic style: IEEE/ACM systems-paper clean.
- White background, no gradients, no shadows
- Muted, colorblind-safe palette (Paul Tol's muted set)
- Computer Modern / DejaVu Serif fonts
- Thin lines, small markers, hatching for differentiation
- No chart-junk: minimal gridlines, tight layouts
"""

import json, os, sys
import numpy as np
import matplotlib as mpl
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.ticker import MaxNLocator

# ─── Global Style ─────────────────────────────────────────────────────────────

mpl.rcParams.update({
    # Font
    "font.family":        "serif",
    "font.serif":         ["DejaVu Serif", "Times New Roman", "Palatino", "serif"],
    "font.size":          9,
    "axes.titlesize":     9,
    "axes.labelsize":     9,
    "xtick.labelsize":    8,
    "ytick.labelsize":    8,
    "legend.fontsize":    8,
    "legend.title_fontsize": 8,

    # Lines and markers
    "lines.linewidth":    1.2,
    "lines.markersize":   4,

    # Axes
    "axes.spines.top":    False,
    "axes.spines.right":  False,
    "axes.linewidth":     0.8,
    "axes.grid":          True,
    "grid.linewidth":     0.4,
    "grid.color":         "#cccccc",
    "grid.alpha":         1.0,
    "axes.axisbelow":     True,

    # Figure
    "figure.facecolor":   "white",
    "axes.facecolor":     "white",
    "savefig.facecolor":  "white",
    "savefig.dpi":        300,
    "savefig.bbox":       "tight",
    "savefig.pad_inches": 0.05,

    # Legend
    "legend.frameon":     True,
    "legend.framealpha":  1.0,
    "legend.edgecolor":   "#cccccc",
    "legend.fancybox":    False,

    # PDF backend for vector
    "pdf.fonttype": 42,
    "ps.fonttype":  42,
})

# Paul Tol's muted colorblind-safe palette
COLORS = {
    "TRACE":      "#4477AA",   # blue
    "REPUTATION": "#AA3377",   # rose
    "PRICE":      "#BBBBBB",   # grey
    "v2.1":       "#4477AA",   # blue
    "v2.2":       "#228833",   # green
    "v2.3":       "#EE6677",   # red
    "bar_a":      "#4477AA",
    "bar_b":      "#CCDDEE",
    "neutral":    "#555555",
}

HATCHES = {
    "TRACE":      "",
    "REPUTATION": "///",
    "PRICE":      "xxx",
    "v2.1":       "",
    "v2.2":       "///",
    "v2.3":       "xxx",
}

FIG_DIR = os.path.join(os.path.dirname(__file__), "..", "paper", "figures")
DATA_DIR = FIG_DIR


def load(name):
    with open(os.path.join(DATA_DIR, name)) as f:
        return json.load(f)


def save(fig, name):
    path = os.path.join(FIG_DIR, name)
    fig.savefig(path + ".pdf")
    fig.savefig(path + ".png")
    plt.close(fig)
    print(f"  [ok] {name}.pdf / .png")


# ─── Figure 3: Scaling Results ────────────────────────────────────────────────

def fig3_scaling():
    data = load("fig3_scaling_fraud.json")["data"]
    policies = ["TRACE", "REPUTATION", "PRICE"]
    labels   = ["TRACE", "Reputation", "Price"]

    fig, ax = plt.subplots(figsize=(3.3, 2.4))

    markers = {"TRACE": "o", "REPUTATION": "s", "PRICE": "^"}
    linestyles = {"TRACE": "-", "REPUTATION": "--", "PRICE": ":"}

    for policy, label in zip(policies, labels):
        pts = data[policy]
        ns   = [p["n"]    for p in pts]
        means = [p["mean"] for p in pts]
        stds  = [p["std"]  for p in pts]

        ax.plot(ns, means,
                color=COLORS[policy],
                marker=markers[policy],
                linestyle=linestyles[policy],
                label=label,
                zorder=3)
        ax.fill_between(ns,
                        [m - s for m, s in zip(means, stds)],
                        [m + s for m, s in zip(means, stds)],
                        color=COLORS[policy], alpha=0.12, linewidth=0)

    ax.set_xlabel("Network Size ($N$)")
    ax.set_ylabel("Fraud Exposure (sats)")
    ax.set_title("Fig. 3 — Fraud vs. Network Scale\n(Collusion Ring, 30% malicious, 20 seeds)",
                 fontsize=8)
    ax.set_xticks([30, 50, 100])
    ax.yaxis.set_major_locator(MaxNLocator(integer=True, nbins=5))
    ax.legend(loc="upper right", framealpha=1)
    ax.set_xlim(22, 108)
    ax.set_ylim(bottom=0)

    fig.tight_layout()
    save(fig, "fig3_scaling_fraud")


# ─── Figure 5: Complexity vs Stability ───────────────────────────────────────

def fig5_complexity():
    data = load("fig5_complexity_stability.json")["data"]
    versions = ["v2.1", "v2.2", "v2.3"]
    x = np.arange(len(versions))
    width = 0.26

    fig, axes = plt.subplots(1, 3, figsize=(6.5, 2.4), sharey=False)

    # Panel A: Fraud mean ± σ
    ax = axes[0]
    means = data["fraudMean"]
    sigmas = data["fraudSigma"]
    bars = ax.bar(x, means, width * 2.5,
                  color=[COLORS[v] for v in versions],
                  hatch=[HATCHES[v] for v in versions],
                  edgecolor="black", linewidth=0.6, zorder=3)
    ax.errorbar(x, means, yerr=sigmas,
                fmt="none", color="black", capsize=3, linewidth=0.8, zorder=4)
    ax.set_xticks(x)
    ax.set_xticklabels(versions)
    ax.set_ylabel("Fraud Exposure (sats)")
    ax.set_title("(a) Mean Fraud ± σ", fontsize=8)
    ax.set_ylim(bottom=0)
    ax.yaxis.set_major_locator(MaxNLocator(nbins=5))

    # Panel B: Fraud variance (σ)
    ax = axes[1]
    ax.bar(x, sigmas, width * 2.5,
           color=[COLORS[v] for v in versions],
           hatch=[HATCHES[v] for v in versions],
           edgecolor="black", linewidth=0.6, zorder=3)
    ax.set_xticks(x)
    ax.set_xticklabels(versions)
    ax.set_ylabel("Fraud Std. Dev. σ (sats)")
    ax.set_title("(b) Fraud Variance", fontsize=8)
    ax.set_ylim(bottom=0)

    # Panel C: Honest routing %
    ax = axes[2]
    honest = data["honestRouting"]
    ax.bar(x, honest, width * 2.5,
           color=[COLORS[v] for v in versions],
           hatch=[HATCHES[v] for v in versions],
           edgecolor="black", linewidth=0.6, zorder=3)
    ax.set_xticks(x)
    ax.set_xticklabels(versions)
    ax.set_ylabel("Honest Routing Share (%)")
    ax.set_title("(c) Honest Routing", fontsize=8)
    ax.set_ylim(70, 90)

    # Shared title
    fig.suptitle("Fig. 5 — Complexity vs. Stability (Collusion Ring, $N$=50, 20 seeds)",
                 fontsize=8, y=1.01)
    fig.tight_layout()
    save(fig, "fig5_complexity_stability")


# ─── Figure 6: False Suppression ─────────────────────────────────────────────

def fig6_suppression():
    data = load("fig6_false_suppression.json")["data"]
    versions = [d["version"] for d in data]
    means    = [d["mean"]    for d in data]
    stds     = [d["std"]     for d in data]
    x = np.arange(len(versions))

    fig, ax = plt.subplots(figsize=(3.0, 2.4))

    bars = ax.bar(x, means, 0.5,
                  color=[COLORS[v] for v in versions],
                  hatch=[HATCHES[v] for v in versions],
                  edgecolor="black", linewidth=0.6, zorder=3)
    ax.errorbar(x, means, yerr=stds,
                fmt="none", color="black", capsize=3, linewidth=0.8, zorder=4)

    # Annotate the drop
    ax.annotate("", xy=(1, means[1]), xytext=(0, means[0]),
                arrowprops=dict(arrowstyle="->", color="#555555", lw=0.8),
                xycoords="data", textcoords="data")
    ax.text(0.55, (means[0] + means[1]) / 2 + 0.5, "−3 pp",
            fontsize=7, color="#555555", ha="center")

    ax.set_xticks(x)
    ax.set_xticklabels(["v2.1", "v2.2", "v2.3"])
    ax.set_ylabel("Honest Routing Share (%)")
    ax.set_title("Fig. 6 — Honest Routing by Version\n(Collusion Ring, $N$=50, 20 seeds)",
                 fontsize=8)
    ax.set_ylim(60, 100)
    ax.yaxis.set_major_locator(MaxNLocator(nbins=5))

    fig.tight_layout()
    save(fig, "fig6_false_suppression")


# ─── Figure 4: Ablation ───────────────────────────────────────────────────────

def fig4_ablation():
    data = load("fig4_ablation.json")["data"]
    configs = [d["config"] for d in data]
    values  = [d["fraud"]  for d in data]
    stds    = [d["std"]    for d in data]

    # Short labels for x-axis
    short = ["Full\nTRACE v2.1", "− Repeated-\npair Decay", "− Clique\nPenalty", "− Both\nMechanisms"]
    colors = [COLORS["v2.1"], "#888888", "#888888", "#444444"]
    hatches = ["", "///", "xxx", "///"]

    fig, ax = plt.subplots(figsize=(3.5, 2.6))
    x = np.arange(len(short))

    bars = ax.bar(x, values, 0.55,
                  color=colors, hatch=hatches,
                  edgecolor="black", linewidth=0.6, zorder=3)
    ax.errorbar(x, values, yerr=stds,
                fmt="none", color="black", capsize=3, linewidth=0.8, zorder=4)

    ax.set_xticks(x)
    ax.set_xticklabels(short, fontsize=7.5)
    ax.set_ylabel("Fraud Exposure (sats)")
    ax.set_title("Fig. 4 — Ablation Study\n(Collusion Ring, $N$=50)", fontsize=8)
    ax.set_ylim(bottom=0)

    # % increase labels
    baseline = values[0]
    for i, (v, bar) in enumerate(zip(values, bars)):
        if i == 0:
            continue
        pct = (v - baseline) / baseline * 100
        ax.text(bar.get_x() + bar.get_width() / 2, v + stds[i] + 4,
                f"+{pct:.0f}%", ha="center", fontsize=7, color="#333333")

    fig.tight_layout()
    save(fig, "fig4_ablation")


# ─── Figure 7: Sensitivity ────────────────────────────────────────────────────

def fig7_sensitivity():
    data = load("fig7_sensitivity.json")["parameters"]

    fig, ax = plt.subplots(figsize=(3.5, 2.6))

    ls_styles = ["-o", "--s", ":^"]
    param_labels = [
        "Entropy weight ($w_4$)",
        "Decay rate ($\\lambda$)",
        "Clique threshold ($\\theta$)",
    ]
    param_colors = [COLORS["v2.1"], COLORS["v2.2"], COLORS["v2.3"]]

    for param, ls, label, color in zip(data, ls_styles, param_labels, param_colors):
        ax.plot(param["perturbations"], param["impacts"],
                ls, color=color, label=label, markersize=4, zorder=3)

    ax.axhline(0, color="black", linewidth=0.6, linestyle="--", zorder=2)
    ax.axvline(0, color="#cccccc", linewidth=0.5, zorder=1)
    ax.set_xlabel("Parameter Perturbation (%)")
    ax.set_ylabel("Relative Fraud Change (%)")
    ax.set_title("Fig. 7 — Sensitivity Analysis\n(Collusion Ring, $N$=50, 5 seeds)", fontsize=8)
    ax.legend(loc="upper left", fontsize=7)
    ax.set_xticks([-50, -25, 0, 25, 50])

    fig.tight_layout()
    save(fig, "fig7_sensitivity")


# ─── Figure 2: Threat Model Table ────────────────────────────────────────────

def fig2_threat_models():
    attacks = load("fig2_threat_models.json")["attacks"]

    fig, ax = plt.subplots(figsize=(5.5, 2.0))
    ax.set_axis_off()

    col_labels = ["Attack", "Adversarial Behavior", "Economic Goal", "TRACE Signal"]
    rows_data = [
        [a["name"], a["behavior"], a["target"], a["indicator"]]
        for a in attacks
    ]

    tbl = ax.table(
        cellText=rows_data,
        colLabels=col_labels,
        loc="center",
        cellLoc="left",
    )
    tbl.auto_set_font_size(False)
    tbl.set_fontsize(8)
    tbl.auto_set_column_width(col=list(range(len(col_labels))))

    # Style header
    for (row, col), cell in tbl.get_celld().items():
        cell.set_edgecolor("#cccccc")
        if row == 0:
            cell.set_facecolor("#f0f0f0")
            cell.set_text_props(weight="bold")
        else:
            cell.set_facecolor("white")
        cell.set_linewidth(0.5)

    ax.set_title("Fig. 2 — Adversarial Threat Models", fontsize=8, pad=8)
    fig.tight_layout()
    save(fig, "fig2_threat_models")


# ─── Figure 1: Architecture Diagram ──────────────────────────────────────────

def fig1_architecture():
    fig, ax = plt.subplots(figsize=(5.5, 3.0))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 5.5)
    ax.set_axis_off()

    def box(cx, cy, w, h, label, sublabel="", color="#E8EEF4", lw=0.8):
        rect = mpatches.FancyBboxPatch(
            (cx - w/2, cy - h/2), w, h,
            boxstyle="round,pad=0.05",
            linewidth=lw, edgecolor="#555555", facecolor=color,
            zorder=2
        )
        ax.add_patch(rect)
        ax.text(cx, cy + (0.15 if sublabel else 0), label,
                ha="center", va="center", fontsize=8, fontweight="bold", zorder=3)
        if sublabel:
            ax.text(cx, cy - 0.25, sublabel,
                    ha="center", va="center", fontsize=6.5, color="#444444", zorder=3)

    def arrow(x1, y1, x2, y2, label="", bidirectional=False):
        style = "<->" if bidirectional else "->"
        ax.annotate("",
            xy=(x2, y2), xytext=(x1, y1),
            arrowprops=dict(arrowstyle=style, color="#333333", lw=0.7),
            zorder=4)
        if label:
            mx, my = (x1+x2)/2, (y1+y2)/2
            ax.text(mx + 0.05, my + 0.1, label,
                    fontsize=6, color="#444444", ha="center", zorder=5)

    # Nodes
    box(5.0, 5.0, 2.8, 0.7, "Orchestrator",         "Selects provider per task",       color="#DDEEFF")
    box(2.0, 3.4, 2.2, 0.7, "Provider Registry",    "Available agents + TRACE scores", color="#F0F4F0")
    box(8.0, 3.4, 2.2, 0.7, "Routing Utility",      "Balances quality/price/risk",     color="#F0F4F0")
    box(5.0, 3.4, 2.2, 0.7, "TRACE Scorer",         "6-factor composite score",        color="#FFF8EC")
    box(2.0, 1.7, 2.2, 0.7, "Provider Agents",      "Execute tasks, receive payment",  color="#F4F0F4")
    box(8.0, 1.7, 2.2, 0.7, "Economic Ledger",      "Records outcomes",                color="#F4F0F4")
    box(5.0, 1.7, 2.2, 0.7, "Trust Updater",        "Updates scores post-settlement",  color="#FFF8EC")
    box(5.0, 0.4, 2.4, 0.55,"Lightning Settlement",  "Cryptographic payment",           color="#F0F0F0")

    # Arrows
    arrow(5.0, 4.65, 2.0, 3.75,  "query")
    arrow(5.0, 4.65, 8.0, 3.75,  "utilities")
    arrow(5.0, 4.65, 5.0, 3.75)
    arrow(2.0, 3.05, 5.0, 3.75,  "scores")
    arrow(8.0, 3.05, 5.0, 3.75)
    arrow(2.0, 3.05, 2.0, 2.05,  "select")
    arrow(2.0, 1.35, 5.0, 2.05,  "outcome")
    arrow(5.0, 1.35, 5.0, 0.68)
    arrow(5.0, 0.68, 8.0, 1.35,  "settle")
    arrow(8.0, 2.05, 5.0, 2.05)
    arrow(5.0, 2.05, 5.0, 3.05,  "update")

    ax.set_title("Fig. 1 — TRACE System Architecture", fontsize=8, pad=4)
    fig.tight_layout()
    save(fig, "fig1_architecture")


# ─── Run All ──────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("Rendering paper figures...")
    fig1_architecture()
    fig2_threat_models()
    fig3_scaling()
    fig4_ablation()
    fig5_complexity()
    fig6_suppression()
    fig7_sensitivity()
    print("\nAll figures saved to paper/figures/")
