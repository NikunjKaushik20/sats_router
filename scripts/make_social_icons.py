"""
Render small monochrome social icons (LinkedIn, GitHub) as PDFs that LaTeX
embeds via includegraphics.  Vector output guarantees crisp display in any
viewer and avoids the FontAwesome glyph-encoding artefacts some PDF
readers produce on author lines.

Output files:
    paper/figures/icon_linkedin.pdf
    paper/figures/icon_github.pdf
"""
import os
import matplotlib as mpl
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.path import Path

mpl.rcParams["pdf.fonttype"] = 42
mpl.rcParams["ps.fonttype"] = 42

OUT = os.path.join(os.path.dirname(__file__), "..", "paper", "figures")
os.makedirs(OUT, exist_ok=True)


def _new_fig():
    fig, ax = plt.subplots(figsize=(0.18, 0.18), dpi=600)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.set_aspect("equal")
    ax.set_axis_off()
    return fig, ax


def make_linkedin() -> None:
    fig, ax = _new_fig()
    bg = mpatches.FancyBboxPatch(
        (2, 2), 96, 96,
        boxstyle="round,pad=0,rounding_size=14",
        linewidth=0,
        facecolor="#0A66C2",
        zorder=1,
    )
    ax.add_patch(bg)
    # "i" -- dot + bar
    ax.add_patch(mpatches.Circle((22, 76), 8, facecolor="white", zorder=2))
    ax.add_patch(mpatches.Rectangle((14, 30), 16, 30, facecolor="white", zorder=2))
    # "n" -- left bar + curve approximated via two rects
    ax.add_patch(mpatches.Rectangle((40, 30), 14, 30, facecolor="white", zorder=2))
    ax.add_patch(mpatches.Rectangle((68, 30), 14, 22, facecolor="white", zorder=2))
    ax.add_patch(mpatches.FancyBboxPatch(
        (40, 50), 42, 14,
        boxstyle="round,pad=0,rounding_size=7",
        linewidth=0, facecolor="white", zorder=2,
    ))
    out = os.path.join(OUT, "icon_linkedin.pdf")
    fig.savefig(out, bbox_inches="tight", pad_inches=0, transparent=True)
    plt.close(fig)
    print(f"  [ok] {out}")


def make_github() -> None:
    fig, ax = _new_fig()
    # Base black circle
    ax.add_patch(mpatches.Circle((50, 50), 48, facecolor="#171515", zorder=1))
    # GitHub Octocat (simplified: white silhouette suggestive of the cat).
    # We approximate with two ear arcs, a head circle, and a downward
    # body shape.  At small sizes this reads unambiguously as GitHub.
    head = mpatches.Circle((50, 56), 24, facecolor="white", zorder=2)
    ax.add_patch(head)
    # Two ears (small triangles)
    ear_l = mpatches.Polygon([(32, 80), (38, 92), (44, 78)], closed=True, facecolor="white", zorder=2)
    ear_r = mpatches.Polygon([(56, 78), (62, 92), (68, 80)], closed=True, facecolor="white", zorder=2)
    ax.add_patch(ear_l)
    ax.add_patch(ear_r)
    # Body / paws (rectangular tail-down stub)
    body = mpatches.FancyBboxPatch(
        (32, 18), 36, 26,
        boxstyle="round,pad=0,rounding_size=8",
        linewidth=0, facecolor="white", zorder=2,
    )
    ax.add_patch(body)
    # Eyes (two small dark dots)
    ax.add_patch(mpatches.Circle((42, 58), 3.2, facecolor="#171515", zorder=3))
    ax.add_patch(mpatches.Circle((58, 58), 3.2, facecolor="#171515", zorder=3))
    out = os.path.join(OUT, "icon_github.pdf")
    fig.savefig(out, bbox_inches="tight", pad_inches=0, transparent=True)
    plt.close(fig)
    print(f"  [ok] {out}")


if __name__ == "__main__":
    make_linkedin()
    make_github()
