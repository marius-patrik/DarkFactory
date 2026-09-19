#!/usr/bin/env python3
"""Build the static GitHub Pages selector for all thesis PDF variants."""

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
        "subtitle": "Czech projection with Czech terminology where the bilingual helpers are used",
        "final": "prace-cs.pdf",
        "review": "prace-cs-review.pdf",
        "recommended": False,
    },
    {
        "profile": "en",
        "title": "English version",
        "subtitle": "English projection; sections not yet authored bilingually remain in their source language",
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

OUT = Path("out")
SITE = Path("site")

parser = argparse.ArgumentParser()
parser.add_argument(
    "--allow-missing",
    action="store_true",
    help="build the HTML/manifest even when PDFs are absent (used by docs-only CI)",
)
args = parser.parse_args()

SITE.mkdir(parents=True, exist_ok=True)

for variant in VARIANTS:
    for key in ("final", "review"):
        source = OUT / variant[key]
        if not source.is_file():
            if args.allow_missing:
                continue
            raise SystemExit(f"missing generated PDF: {source}")
        shutil.copy2(source, SITE / source.name)

manifest = {
    "commit": os.environ.get("GITHUB_SHA", ""),
    "variants": VARIANTS,
}
(SITE / "variants.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

cards = []
for variant in VARIANTS:
    badge = '<span class="badge">recommended / doporučená</span>' if variant["recommended"] else ""
    cards.append(
        f"""
        <article class="card">
          <div class="card-head">
            <h2>{html.escape(variant["title"])}</h2>
            {badge}
          </div>
          <p>{html.escape(variant["subtitle"])}</p>
          <div class="actions">
            <a class="primary" href="{html.escape(variant["final"])}">Open final PDF</a>
            <a href="{html.escape(variant["review"])}">Open review PDF</a>
          </div>
        </article>
        """
    )

page = f"""<!doctype html>
<html lang="cs">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Odborná práce - publikované verze</title>
  <style>
    :root {{
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color-scheme: light dark;
    }}
    body {{
      margin: 0;
      background: Canvas;
      color: CanvasText;
    }}
    main {{
      width: min(980px, calc(100% - 32px));
      margin: 48px auto;
    }}
    h1 {{ margin-bottom: 8px; }}
    .intro {{ max-width: 760px; opacity: .78; margin-bottom: 28px; }}
    .grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
    }}
    .card {{
      border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
      border-radius: 12px;
      padding: 18px;
      background: color-mix(in srgb, Canvas 96%, CanvasText 4%);
    }}
    .card-head {{
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
    }}
    .card h2 {{ font-size: 1.08rem; margin: 0; }}
    .card p {{ line-height: 1.45; opacity: .78; min-height: 3.8em; }}
    .badge {{
      font-size: .72rem;
      padding: 3px 7px;
      border: 1px solid currentColor;
      border-radius: 999px;
      opacity: .72;
      white-space: nowrap;
    }}
    .actions {{ display: flex; gap: 8px; flex-wrap: wrap; }}
    a {{
      color: inherit;
      text-decoration: none;
      border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
      border-radius: 8px;
      padding: 8px 10px;
    }}
    a.primary {{ font-weight: 650; }}
    footer {{ margin-top: 28px; opacity: .65; font-size: .9rem; }}
  </style>
</head>
<body>
  <main>
    <h1>Odborná práce / Thesis</h1>
    <p class="intro">
      Všechny varianty jsou generovány z jednoho Typst zdroje a otevírají se jako
      přímé PDF soubory v nativním prohlížeči prohlížeče. Review varianty navíc
      obsahují pracovní značky, callouty a diffy.
    </p>
    <section class="grid">
      {''.join(cards)}
    </section>
    <footer>
      Build commit: {html.escape(os.environ.get("GITHUB_SHA", "local")[:12] or "local")}
    </footer>
  </main>
</body>
</html>
"""

(SITE / "index.html").write_text(page, encoding="utf-8")
(SITE / ".nojekyll").touch()
print(f"ok: built Pages site definition for {len(VARIANTS) * 2} PDF links")
