#!/usr/bin/env python3
"""Build GitHub Pages for all document-template/profile/review variants."""

from __future__ import annotations

import argparse
import html
import json
import os
import shutil
from pathlib import Path

VARIANTS = (
    {
        "profile": "school",
        "title": "Školní česká verze",
        "subtitle": "Czech body, canonical English technical terms, bilingual annotation and keywords",
        "final": "prace.pdf",
        "review": "prace-review.pdf",
        "recommended": True,
    },
    {
        "profile": "cs",
        "title": "Čistě česká verze",
        "subtitle": "Czech projection with Czech terminology where bilingual helpers are used",
        "final": "prace-cs.pdf",
        "review": "prace-cs-review.pdf",
        "recommended": False,
    },
    {
        "profile": "en",
        "title": "English version",
        "subtitle": "English projection; source sections not yet bilingual remain in their source language",
        "final": "prace-en.pdf",
        "review": "prace-en-review.pdf",
        "recommended": False,
    },
    {
        "profile": "merged",
        "title": "Česky + English",
        "subtitle": "Merged bilingual projection; bilingual source blocks render both language versions",
        "final": "prace-bilingual.pdf",
        "review": "prace-bilingual-review.pdf",
        "recommended": False,
    },
)

DEFAULT_TEMPLATE = "gjkt-odborna-prace"
OUT = Path("out")
SITE = Path("site")

parser = argparse.ArgumentParser()
parser.add_argument(
    "--allow-missing",
    action="store_true",
    help="build HTML/manifest even when PDFs are absent (docs-only CI)",
)
args = parser.parse_args()

template_names = sorted(
    path.parent.name for path in Path("templates").glob("*/template.typ")
)
if not template_names:
    raise SystemExit("no templates discovered")

SITE.mkdir(parents=True, exist_ok=True)

def source_for(template_name: str, filename: str) -> Path:
    if template_name == DEFAULT_TEMPLATE:
        return OUT / filename
    return OUT / "templates" / template_name / filename

def href_for(template_name: str, filename: str) -> str:
    if template_name == DEFAULT_TEMPLATE:
        return filename
    return f"templates/{template_name}/{filename}"

for template_name in template_names:
    for variant in VARIANTS:
        for key in ("final", "review"):
            source = source_for(template_name, variant[key])
            target = SITE / href_for(template_name, variant[key])
            if not source.is_file():
                if args.allow_missing:
                    continue
                raise SystemExit(f"missing generated PDF: {source}")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)

manifest = {
    "commit": os.environ.get("GITHUB_SHA", ""),
    "default_template": DEFAULT_TEMPLATE,
    "templates": template_names,
    "variants": VARIANTS,
}
(SITE / "variants.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

sections = []
for template_name in template_names:
    cards = []
    for variant in VARIANTS:
        badge = (
            '<span class="badge">recommended / doporučená</span>'
            if template_name == DEFAULT_TEMPLATE and variant["recommended"]
            else ""
        )
        final_href = href_for(template_name, variant["final"])
        review_href = href_for(template_name, variant["review"])
        cards.append(
            f"""
            <article class="card">
              <div class="card-head">
                <h3>{html.escape(variant["title"])}</h3>
                {badge}
              </div>
              <p>{html.escape(variant["subtitle"])}</p>
              <div class="actions">
                <a class="primary" href="{html.escape(final_href)}">Open final PDF</a>
                <a href="{html.escape(review_href)}">Open review PDF</a>
              </div>
            </article>
            """
        )

    default_label = " <span class=\"template-default\">default</span>" if template_name == DEFAULT_TEMPLATE else ""
    sections.append(
        f"""
        <section class="template-section">
          <h2>{html.escape(template_name)}{default_label}</h2>
          <div class="grid">
            {''.join(cards)}
          </div>
        </section>
        """
    )

page = f"""<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>DarkFactory-Paper - publikované verze</title>
  <style>
    :root {{
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color-scheme: light dark;
    }}
    body {{ margin: 0; background: Canvas; color: CanvasText; }}
    main {{ width: min(1080px, calc(100% - 32px)); margin: 48px auto; }}
    h1 {{ margin-bottom: 8px; }}
    .intro {{ max-width: 800px; opacity: .78; margin-bottom: 32px; line-height: 1.5; }}
    .template-section {{ margin-top: 34px; }}
    .template-section h2 {{ display: flex; align-items: center; gap: 10px; }}
    .template-default, .badge {{
      font-size: .72rem; padding: 3px 7px; border: 1px solid currentColor;
      border-radius: 999px; opacity: .72; white-space: nowrap; font-weight: 500;
    }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }}
    .card {{
      border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
      border-radius: 12px; padding: 18px;
      background: color-mix(in srgb, Canvas 96%, CanvasText 4%);
    }}
    .card-head {{
      display: flex; gap: 10px; align-items: center; justify-content: space-between;
    }}
    .card h3 {{ font-size: 1.04rem; margin: 0; }}
    .card p {{ line-height: 1.45; opacity: .78; min-height: 3.8em; }}
    .actions {{ display: flex; gap: 8px; flex-wrap: wrap; }}
    a {{
      color: inherit; text-decoration: none;
      border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
      border-radius: 8px; padding: 8px 10px;
    }}
    a.primary {{ font-weight: 650; }}
    footer {{ margin-top: 36px; opacity: .65; font-size: .9rem; }}
  </style>
</head>
<body>
  <main>
    <h1>Odborná práce / Thesis</h1>
    <p class="intro">
      Všechny varianty vznikají z jednoho rukopisu. Výstup je určen kombinací
      dokumentové šablony, publikačního profilu a final/review režimu. Odkazy míří
      přímo na PDF a otevírají se v nativním PDF vieweru prohlížeče.
    </p>
    {''.join(sections)}
    <footer>
      Build commit: {html.escape(os.environ.get("GITHUB_SHA", "local")[:12] or "local")}
    </footer>
  </main>
</body>
</html>
"""

(SITE / "index.html").write_text(page, encoding="utf-8")
(SITE / ".nojekyll").touch()
print(
    f"ok: built Pages definition for {len(template_names)} templates x "
    f"{len(VARIANTS) * 2} variants"
)
