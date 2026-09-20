#!/usr/bin/env python3
"""Build GitHub Pages from the React viewer and Typst publication matrix."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
from html.parser import HTMLParser
from pathlib import Path

VARIANTS = (
    {
        "profile": "school",
        "title": "Školní česká verze",
        "subtitle": "Czech body, canonical English technical terms, bilingual annotation and keywords",
        "final": "prace.pdf",
        "review": "prace-review.pdf",
        "artifacts": {
            "final": {"pdf": "prace.pdf", "markdown": "prace.md", "html": "prace.html"},
            "review": {"pdf": "prace-review.pdf", "markdown": "prace-review.md", "html": "prace-review.html"},
        },
        "recommended": True,
    },
    {
        "profile": "cs",
        "title": "Čistě česká verze",
        "subtitle": "Czech projection with Czech terminology where bilingual helpers are used",
        "final": "prace-cs.pdf",
        "review": "prace-cs-review.pdf",
        "artifacts": {
            "final": {"pdf": "prace-cs.pdf", "markdown": "prace-cs.md", "html": "prace-cs.html"},
            "review": {"pdf": "prace-cs-review.pdf", "markdown": "prace-cs-review.md", "html": "prace-cs-review.html"},
        },
        "recommended": False,
    },
    {
        "profile": "en",
        "title": "English version",
        "subtitle": "English projection; source sections not yet bilingual remain in their source language",
        "final": "prace-en.pdf",
        "review": "prace-en-review.pdf",
        "artifacts": {
            "final": {"pdf": "prace-en.pdf", "markdown": "prace-en.md", "html": "prace-en.html"},
            "review": {"pdf": "prace-en-review.pdf", "markdown": "prace-en-review.md", "html": "prace-en-review.html"},
        },
        "recommended": False,
    },
    {
        "profile": "merged",
        "title": "Česky + English",
        "subtitle": "Merged bilingual projection; bilingual source blocks render both language versions",
        "final": "prace-bilingual.pdf",
        "review": "prace-bilingual-review.pdf",
        "artifacts": {
            "final": {"pdf": "prace-bilingual.pdf", "markdown": "prace-bilingual.md", "html": "prace-bilingual.html"},
            "review": {"pdf": "prace-bilingual-review.pdf", "markdown": "prace-bilingual-review.md", "html": "prace-bilingual-review.html"},
        },
        "recommended": False,
    },
)

DEFAULT_TEMPLATE = "gjkt-odborna-prace"
PDFJS_VERSION = "6.3.289"
WORK_TITLE = "DarkFactory: Umělá inteligence v praxi - Agentické a harnessové inženýrství"
OUT = Path("out")
SITE = Path("site")
WEB_DIST = Path("web/dist")

parser = argparse.ArgumentParser()
parser.add_argument(
    "--allow-missing",
    action="store_true",
    help="build the React site/manifest even when compiled publication artifacts are absent",
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


def tracked_repo_tree() -> list[dict[str, object]]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        check=True,
        capture_output=True,
    )
    paths = [entry.decode("utf-8") for entry in result.stdout.split(b"\0") if entry]
    root: dict[str, object] = {}

    for path in paths:
        parts = path.split("/")
        cursor = root
        for index, part in enumerate(parts):
            last = index == len(parts) - 1
            if last:
                cursor.setdefault(part, {"__file__": path})
            else:
                value = cursor.setdefault(part, {})
                if not isinstance(value, dict):
                    break
                cursor = value

    def materialize(node: dict[str, object], prefix: str = "") -> list[dict[str, object]]:
        rows: list[dict[str, object]] = []
        names = sorted(
            node,
            key=lambda name: (
                "__file__" in node[name] if isinstance(node[name], dict) else True,
                name.lower(),
            ),
        )
        for name in names:
            value = node[name]
            if not isinstance(value, dict):
                continue
            path = f"{prefix}/{name}".lstrip("/")
            if "__file__" in value:
                rows.append({"name": name, "path": str(value["__file__"]), "type": "file"})
            else:
                rows.append(
                    {
                        "name": name,
                        "path": path,
                        "type": "directory",
                        "children": materialize(value, path),
                    }
                )
        return rows

    return materialize(root)


class HeadingIndexParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.entries: list[dict[str, object]] = []
        self._level: int | None = None
        self._parts: list[str] = []
        self._attrs: dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if len(tag) == 2 and tag[0] == "h" and tag[1].isdigit():
            self._level = int(tag[1])
            self._parts = []
            self._attrs = {key: value or "" for key, value in attrs}

    def handle_data(self, data: str) -> None:
        if self._level is not None:
            self._parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if self._level is None or tag != f"h{self._level}":
            return
        title = " ".join("".join(self._parts).split())
        if title:
            self.entries.append(
                {
                    "title": title,
                    "level": self._level,
                    "anchor": self._attrs.get("id", ""),
                }
            )
        self._level = None
        self._parts = []
        self._attrs = {}


def semantic_content_index(html_path: Path) -> list[dict[str, object]]:
    parser = HeadingIndexParser()
    parser.feed(html_path.read_text(encoding="utf-8"))
    entries: list[dict[str, object]] = []
    for entry in parser.entries:
        title = str(entry["title"])
        if entries and entries[-1]["title"] == title and entries[-1]["level"] == entry["level"]:
            continue
        entries.append(entry)
    return entries


for template_name in template_names:
    for variant in VARIANTS:
        for mode in ("final", "review"):
            for artifact_format, filename in variant["artifacts"][mode].items():
                source = source_for(template_name, filename)
                target = SITE / href_for(template_name, filename)
                if not source.is_file():
                    if args.allow_missing:
                        continue
                    raise SystemExit(
                        f"missing generated {artifact_format} publication: {source}"
                    )
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)

content_index: dict[str, dict[str, dict[str, list[dict[str, object]]]]] = {}
for template_name in template_names:
    template_index: dict[str, dict[str, list[dict[str, object]]]] = {}
    for variant in VARIANTS:
        profile_index: dict[str, list[dict[str, object]]] = {}
        for mode in ("final", "review"):
            html_name = variant["artifacts"][mode]["html"]
            html_path = source_for(template_name, html_name)
            if not html_path.is_file():
                if args.allow_missing:
                    profile_index[mode] = []
                    continue
                raise SystemExit(f"missing semantic HTML for content index: {html_path}")
            profile_index[mode] = semantic_content_index(html_path)
        template_index[variant["profile"]] = profile_index
    content_index[template_name] = template_index

manifest = {
    "commit": os.environ.get("GITHUB_SHA", ""),
    "work_title": WORK_TITLE,
    "default_template": DEFAULT_TEMPLATE,
    "templates": template_names,
    "variants": VARIANTS,
    "viewer": {
        "engine": "React + PDF.js + Monaco Raw + rendered Markdown + compiled Typst HTML",
        "formats": ["pdf", "markdown", "html"],
        "modes": ["viewer", "edit", "raw"],
        "repo_tree": "repo-tree.json",
        "content_index": "content-index.json",
        "repository_url": "https://github.com/marius-patrik/DarkFactory-Paper",
        "pdfjs_version": PDFJS_VERSION,
        "entrypoint": "viewer.html",
        "stack": [
            "React",
            "TypeScript",
            "Rsbuild",
            "Rspack",
            "Biome",
            "shadcn/ui",
            "Motion",
            "Dagre",
            "PDF.js",
            "Monaco Editor",
        ],
    },
}
(SITE / "variants.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
(SITE / "repo-tree.json").write_text(
    json.dumps({"tree": tracked_repo_tree()}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
(SITE / "content-index.json").write_text(
    json.dumps({"templates": content_index}, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
(SITE / ".nojekyll").touch()

for required in (
    SITE / "index.html",
    SITE / "viewer.html",
    SITE / "variants.json",
    SITE / "repo-tree.json",
    SITE / "content-index.json",
):
    if not required.is_file() or required.stat().st_size == 0:
        raise SystemExit(f"missing generated Pages asset: {required}")

static_assets = SITE / "static"
if not static_assets.is_dir() or not any(path.is_file() for path in static_assets.rglob("*")):
    raise SystemExit("Rsbuild output contains no bundled static assets")

print(
    f"ok: built React Pages app for {len(template_names)} templates x "
    f"{len(VARIANTS) * 2 * 3} publication artifacts (PDF/Markdown/HTML) using PDF.js {PDFJS_VERSION}"
)
