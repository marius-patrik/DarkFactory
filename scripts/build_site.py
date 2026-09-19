#!/usr/bin/env python3
"""Build GitHub Pages for all document-template/profile/review variants."""

from __future__ import annotations

import argparse
import html
import json
import os
import shutil
from pathlib import Path
from urllib.parse import urlencode

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
PDFJS_VERSION = "6.3.289"
OUT = Path("out")
SITE = Path("site")
WEB = Path("web")

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


def viewer_href(
    template_name: str,
    filename: str,
    *,
    title: str,
    mode: str,
    peer_filename: str,
    peer_label: str,
) -> str:
    return "viewer.html?" + urlencode(
        {
            "file": href_for(template_name, filename),
            "title": title,
            "mode": mode,
            "peer": href_for(template_name, peer_filename),
            "peer_label": peer_label,
        }
    )


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

for asset in ("viewer.html", "viewer.css", "viewer.js"):
    source = WEB / asset
    if not source.is_file():
        raise SystemExit(f"missing viewer source asset: {source}")
    shutil.copy2(source, SITE / asset)

manifest = {
    "commit": os.environ.get("GITHUB_SHA", ""),
    "default_template": DEFAULT_TEMPLATE,
    "templates": template_names,
    "variants": VARIANTS,
    "viewer": {
        "engine": "PDF.js",
        "pdfjs_version": PDFJS_VERSION,
        "entrypoint": "viewer.html",
    },
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
        final_view = viewer_href(
            template_name,
            variant["final"],
            title=variant["title"],
            mode="final",
            peer_filename=variant["review"],
            peer_label="Review",
        )
        review_view = viewer_href(
            template_name,
            variant["review"],
            title=variant["title"],
            mode="review",
            peer_filename=variant["final"],
            peer_label="Final",
        )
        final_pdf = href_for(template_name, variant["final"])
        cards.append(
            f"""
            <article class="card">
              <div class="card-head">
                <h3>{html.escape(variant["title"])}</h3>
                {badge}
              </div>
              <p>{html.escape(variant["subtitle"])}</p>
              <div class="actions">
                <a class="primary" href="{html.escape(final_view)}">View final</a>
                <a href="{html.escape(review_view)}">Review</a>
                <a class="quiet" href="{html.escape(final_pdf)}" download>PDF</a>
              </div>
            </article>
            """
        )

    default_label = (
        ' <span class="template-default">default</span>'
        if template_name == DEFAULT_TEMPLATE
        else ""
    )
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
      font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color-scheme: light dark;
    }}
    body {{ margin: 0; background: Canvas; color: CanvasText; }}
    main {{ width: min(1080px, calc(100% - 32px)); margin: 48px auto; }}
    h1 {{ margin-bottom: 8px; }}
    .intro {{ max-width: 820px; opacity: .78; margin-bottom: 32px; line-height: 1.55; }}
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
    .actions {{ display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }}
    a {{
      color: inherit; text-decoration: none;
      border: 1px solid color-mix(in srgb, CanvasText 30%, transparent);
      border-radius: 8px; padding: 8px 10px;
    }}
    a.primary {{ font-weight: 650; }}
    a.quiet {{ opacity: .7; border-color: transparent; }}
    footer {{ margin-top: 36px; opacity: .65; font-size: .9rem; }}
  </style>
</head>
<body>
  <main>
    <h1>Odborná práce / Thesis</h1>
    <p class="intro">
      Všechny varianty vznikají z jednoho rukopisu. Výstup je určen kombinací
      dokumentové šablony, publikačního profilu a final/review režimu. Primární
      odkazy otevírají vlastní webový viewer s přesnou PDF sazbou z Typstu;
      přímé PDF zůstává dostupné pro stažení a jako fallback.
    </p>
    {''.join(sections)}
    <footer>
      Build commit: {html.escape(os.environ.get("GITHUB_SHA", "local")[:12] or "local")}
      · Viewer: PDF.js {PDFJS_VERSION}
    </footer>
  </main>
</body>
</html>
"""

(SITE / "index.html").write_text(page, encoding="utf-8")
(SITE / ".nojekyll").touch()

for required in (
    SITE / "index.html",
    SITE / "viewer.html",
    SITE / "viewer.css",
    SITE / "viewer.js",
    SITE / "variants.json",
):
    if not required.is_file() or required.stat().st_size == 0:
        raise SystemExit(f"missing generated Pages viewer asset: {required}")

index_source = (SITE / "index.html").read_text(encoding="utf-8")
if 'href="viewer.html?' not in index_source:
    raise SystemExit("Pages index does not route publication links through custom viewer")

print(
    f"ok: built Pages viewer for {len(template_names)} templates x "
    f"{len(VARIANTS) * 2} variants using PDF.js {PDFJS_VERSION}"
)
