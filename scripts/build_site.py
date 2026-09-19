#!/usr/bin/env python3
"""Build GitHub Pages from the React viewer and Typst publication matrix."""

from __future__ import annotations

import argparse
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
PDFJS_VERSION = "6.3.289"
WORK_TITLE = "Agentické inženýrství a design harnessu pro automatizovaný softwarový vývoj"
OUT = Path("out")
SITE = Path("site")
WEB_DIST = Path("web/dist")

parser = argparse.ArgumentParser()
parser.add_argument(
    "--allow-missing",
    action="store_true",
    help="build the React site/manifest even when Typst PDFs are absent",
)
args = parser.parse_args()

template_names = sorted(
    path.parent.name for path in Path("templates").glob("*/template.typ")
)
if not template_names:
    raise SystemExit("no templates discovered")

for required in (WEB_DIST / "index.html", WEB_DIST / "viewer.html"):
    if not required.is_file():
        raise SystemExit(
            f"missing React web build: {required}; run 'make web-build' first"
        )

if SITE.exists():
    shutil.rmtree(SITE)
shutil.copytree(WEB_DIST, SITE)


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
    "work_title": WORK_TITLE,
    "default_template": DEFAULT_TEMPLATE,
    "templates": template_names,
    "variants": VARIANTS,
    "viewer": {
        "engine": "React + PDF.js",
        "pdfjs_version": PDFJS_VERSION,
        "entrypoint": "viewer.html",
        "stack": [
            "React",
            "TypeScript",
            "shadcn/ui",
            "Motion",
            "Dagre",
            "PDF.js",
        ],
    },
}
(SITE / "variants.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
(SITE / ".nojekyll").touch()

for required in (
    SITE / "index.html",
    SITE / "viewer.html",
    SITE / "variants.json",
):
    if not required.is_file() or required.stat().st_size == 0:
        raise SystemExit(f"missing generated Pages asset: {required}")

assets = SITE / "assets"
if not assets.is_dir() or not any(assets.iterdir()):
    raise SystemExit("React build contains no bundled assets")

print(
    f"ok: built React Pages app for {len(template_names)} templates x "
    f"{len(VARIANTS) * 2} PDF variants using PDF.js {PDFJS_VERSION}"
)
