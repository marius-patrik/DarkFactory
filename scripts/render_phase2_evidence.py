#!/usr/bin/env python3
"""Render deterministic Phase 2 vector evidence from checked-in normalized data."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = "paper" if (ROOT / "paper").exists() else "DarkFactory"
DATA = ROOT / BOOK_DIR / "data" / "phase2-evidence.json"
OUT = ROOT / BOOK_DIR / "img" / "generated"


def svg_text(x: float, y: float, text: str, *, size: int = 18, weight: str = "normal", anchor: str = "start") -> str:
    return (
        f'<text x="{x:.2f}" y="{y:.2f}" font-family="sans-serif" font-size="{size}" '
        f'font-weight="{weight}" text-anchor="{anchor}" fill="#111827">{escape(text)}</text>'
    )


def write_adoption(data: dict) -> None:
    categories = data["categories"]
    assert sum(int(item["dots"]) for item in categories) == int(data["dot_count"]) == 2500
    fills = {"never": "#e5e7eb", "free": "#a8a29e", "paid": "#57534e", "coding": "#111827"}
    strokes = {"never": "#9ca3af", "free": "#78716c", "paid": "#44403c", "coding": "#111827"}

    width, height = 1000, 560
    ox, oy, step, radius = 34, 34, 9.5, 3.25
    circles: list[str] = []
    category_by_index: list[str] = []
    for item in categories:
        category_by_index.extend([item["key"]] * int(item["dots"]))
    assert len(category_by_index) == 2500
    for i, key in enumerate(category_by_index):
        row, col = divmod(i, 50)
        x = ox + col * step
        y = oy + row * step
        circles.append(
            f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{radius}" fill="{fills[key]}" stroke="{strokes[key]}" stroke-width="0.65"/>'
        )

    legend_x = 545
    legend = [svg_text(legend_x, 42, "8,3 mld. lidí = 2 500 bodů", size=22, weight="bold"),
              svg_text(legend_x, 70, "1 bod ≈ 3,3 mil. lidí", size=17)]
    y = 120
    for item in categories:
        key = item["key"]
        legend.append(f'<circle cx="{legend_x + 7}" cy="{y - 5}" r="6.5" fill="{fills[key]}" stroke="{strokes[key]}" stroke-width="1"/>')
        legend.append(svg_text(legend_x + 25, y, item["label_cs"], size=16, weight="bold" if key == "coding" else "normal"))
        people = {"never": "≈ 5,9 mld.", "free": "≈ 2,3 mld.", "paid": "≈ 80 mil.", "coding": "≈ 30 mil."}[key]
        share = "0,36 %" if key == "coding" else f'{item["share_percent"]:g} %'.replace(".", ",")
        legend.append(svg_text(legend_x + 25, y + 24, f'{people} · {share} · {item["dots"]} bodů', size=15))
        y += 86
    legend.append(svg_text(legend_x, 485, "Kategorie se nepřekrývají; člověk je zařazen", size=14))
    legend.append(svg_text(legend_x, 505, "podle nejpokročilejší použité kategorie.", size=14))
    legend.append(svg_text(legend_x, 535, "Coding agents: redakční deduplikovaný odhad (25–35 mil.).", size=14, weight="bold"))

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">'
        '<rect width="100%" height="100%" fill="white"/>'
        + "".join(circles + legend)
        + "</svg>"
    )
    (OUT / "gradually-ai-usage-2026.svg").write_text(svg, encoding="utf-8")


def days(d: str, origin: date) -> int:
    return (date.fromisoformat(d) - origin).days


def write_epoch(data: dict) -> None:
    width, height = 1000, 570
    ml, mr, mt, mb = 86, 32, 40, 92
    plot_w, plot_h = width - ml - mr, height - mt - mb
    start, end = date(2024, 9, 1), date(2026, 6, 15)
    total_days = (end - start).days
    ymin, ymax = 130.0, 165.0

    def xy(d: str, v: float) -> tuple[float, float]:
        x = ml + days(d, start) / total_days * plot_w
        y = mt + (ymax - float(v)) / (ymax - ymin) * plot_h
        return x, y

    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
             '<rect width="100%" height="100%" fill="white"/>']

    for val in range(130, 166, 5):
        y = xy("2024-09-01", val)[1]
        parts.append(f'<line x1="{ml}" y1="{y:.2f}" x2="{width-mr}" y2="{y:.2f}" stroke="#d1d5db" stroke-width="1"/>')
        parts.append(svg_text(ml - 12, y + 5, str(val), size=14, anchor="end"))

    ticks = [("2024-09-01", "09/2024"), ("2025-01-01", "01/2025"), ("2025-05-01", "05/2025"),
             ("2025-09-01", "09/2025"), ("2026-01-01", "01/2026"), ("2026-05-01", "05/2026")]
    for d, label in ticks:
        x, _ = xy(d, ymin)
        parts.append(f'<line x1="{x:.2f}" y1="{mt}" x2="{x:.2f}" y2="{height-mb}" stroke="#f3f4f6" stroke-width="1"/>')
        parts.append(svg_text(x, height - mb + 28, label, size=14, anchor="middle"))

    parts.append(f'<line x1="{ml}" y1="{height-mb}" x2="{width-mr}" y2="{height-mb}" stroke="#111827" stroke-width="1.5"/>')
    parts.append(f'<line x1="{ml}" y1="{mt}" x2="{ml}" y2="{height-mb}" stroke="#111827" stroke-width="1.5"/>')
    parts.append(svg_text((ml + width - mr) / 2, height - 20, "Datum vydání modelu", size=17, anchor="middle"))
    parts.append(f'<text x="22" y="{(mt + height-mb)/2:.2f}" font-family="sans-serif" font-size="17" fill="#111827" text-anchor="middle" transform="rotate(-90 22 {(mt + height-mb)/2:.2f})">Epoch Capabilities Index (ECI)</text>')

    rt = data["trend_lines"]["reasoning"]
    nt = data["trend_lines"]["non_reasoning"]
    x1,y1 = xy(rt[0]["date"], rt[0]["eci"]); x2,y2 = xy(rt[1]["date"], rt[1]["eci"])
    parts.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="#111827" stroke-width="3"/>')
    x1,y1 = xy(nt[0]["date"], nt[0]["eci"]); x2,y2 = xy(nt[1]["date"], nt[1]["eci"])
    parts.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="#6b7280" stroke-width="3" stroke-dasharray="10 7"/>')

    for obs in data["reasoning_observations"]:
        x,y = xy(obs["date"], obs["eci"])
        parts.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="4.3" fill="#111827" stroke="white" stroke-width="1"/>')
    for obs in data["non_reasoning_observations_from_transition"]:
        x,y = xy(obs["date"], obs["eci"])
        parts.append(f'<rect x="{x-4.2:.2f}" y="{y-4.2:.2f}" width="8.4" height="8.4" fill="white" stroke="#4b5563" stroke-width="2"/>')

    lx, ly = 114, 70
    parts.append(f'<line x1="{lx}" y1="{ly}" x2="{lx+50}" y2="{ly}" stroke="#111827" stroke-width="3"/>')
    parts.append(f'<circle cx="{lx+25}" cy="{ly}" r="4" fill="#111827"/>')
    parts.append(svg_text(lx+62, ly+5, "Modely s uvažováním: pozorování + trend ≈ 14 bodů/rok", size=14))
    parts.append(f'<line x1="{lx}" y1="{ly+28}" x2="{lx+50}" y2="{ly+28}" stroke="#6b7280" stroke-width="3" stroke-dasharray="10 7"/>')
    parts.append(f'<rect x="{lx+21}" y="{ly+24}" width="8" height="8" fill="white" stroke="#4b5563" stroke-width="2"/>')
    parts.append(svg_text(lx+62, ly+33, "Modely bez uvažování: pozorování + trend ≈ 6 bodů/rok", size=14))

    parts.append("</svg>")
    (OUT / "epoch-eci-frontier-2026-09-01.svg").write_text("".join(parts), encoding="utf-8")


def main() -> None:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    write_adoption(payload["gradually"])
    write_epoch(payload["epoch"])


if __name__ == "__main__":
    main()
