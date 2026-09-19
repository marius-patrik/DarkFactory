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
        "title": "Čéstě česká verze",
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
PDFJS_VERSION = "6.3.289"

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
    params = urlencode(
        {
            "file": href_for(template_name, filename),
            "title": title,
            "mode": mode,
            "peer": href_for(template_name, peer_filename),
            "peer_label": peer_label,
        }
    )
    return f"viewer.html?{params}"


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

VIEWER_CSS = """
:root {
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color-scheme: light dark;
  --bg: #202124;
  --toolbar: #2b2d31;
  --toolbar-border: #3b3d42;
  --sidebar: #25272b;
  --surface: #303238;
  --surface-2: #393c43;
  --text: #f2f3f5;
  --muted: #a8adb7;
  --accent: #4b8bf5;
  --accent-strong: #74a7ff;
  --page-shadow: 0 10px 35px rgba(0, 0, 0, .35);
  --thumb-active: rgba(75, 139, 245, .18);
}

html[data-theme="light"] {
  color-scheme: light;
  --bg: #e9eaed;
  --toolbar: #ffffff;
  --toolbar-border: #d7d9de;
  --sidebar: #f4f5f7;
  --surface: #ffffff;
  --surface-2: #eef0f4;
  --text: #202124;
  --muted: #686d76;
  --accent: #326edb;
  --accent-strong: #235fcb;
  --page-shadow: 0 10px 34px rgba(20, 25, 34, .16);
  --thumb-active: rgba(50, 110, 219, .13);
}
