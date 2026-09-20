#!/usr/bin/env python3
"""Positive validation for the selected book and generated publication matrix."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

BOOK = os.environ.get("BOOK", "DarkFactory")
ROOT = Path(BOOK)
PROFILES = ("", "-cs", "-en", "-bilingual")
EXPECTED_PDFS = tuple(
    Path("out") / f"prace{profile}{review}.pdf"
    for review in ("", "-review")
    for profile in PROFILES
)
EXPECTED_HTML = tuple(path.with_suffix(".html") for path in EXPECTED_PDFS)
EXPECTED_MARKDOWN = tuple(path.with_suffix(".md") for path in EXPECTED_PDFS)
EXPECTED = EXPECTED_PDFS + EXPECTED_HTML + EXPECTED_MARKDOWN


def fail(message: str) -> None:
    raise SystemExit(f"build check failed: {message}")


def require_file(path: Path, minimum_size: int = 1) -> str:
    if not path.is_file():
        fail(f"missing required file: {path}")
    if path.stat().st_size < minimum_size:
        fail(f"required file is unexpectedly small: {path}")
    return path.read_text(encoding="utf-8")


def validate_publication(path: Path) -> None:
    if not path.is_file():
        fail(f"missing publication artifact: {path}")
    if path.stat().st_size < 256:
        fail(f"publication artifact is unexpectedly small: {path}")
    if path.suffix == ".pdf":
        if path.stat().st_size < 1024:
            fail(f"PDF is unexpectedly small: {path}")
        with path.open("rb") as handle:
            if handle.read(5) != b"%PDF-":
                fail(f"artifact is not a PDF: {path}")
    elif path.suffix == ".html":
        source = path.read_text(encoding="utf-8").lower()
        if "<html" not in source or "<body" not in source:
            fail(f"artifact is not complete HTML: {path}")
    elif path.suffix == ".md":
        source = path.read_text(encoding="utf-8")
        if "#" not in source or len(source.strip()) < 256:
            fail(f"artifact is not substantive Markdown: {path}")


for artifact in EXPECTED:
    validate_publication(artifact)

if not ROOT.is_dir():
    fail(f"selected book root does not exist: {ROOT}")

for stale_root in ("concepts", "templates", "fonts", "bib", "img"):
    if Path(stale_root).exists():
        fail(f"book-owned root must not exist at repository level: {stale_root}/")

template_names = tuple(
    sorted(path.parent.name for path in (ROOT / "templates").glob("*/template.typ"))
)
if not template_names:
    fail(f"no document templates discovered under {ROOT / 'templates'}")

for template_name in template_names:
    template_out = Path("out/templates") / template_name
    for artifact in EXPECTED:
        validate_publication(template_out / artifact.name)
    for profile in PROFILES:
        for extension in (".pdf", ".html", ".md"):
            final = template_out / f"prace{profile}{extension}"
            review = template_out / f"prace{profile}-review{extension}"
            if final.read_bytes() == review.read_bytes():
                fail(f"Final and Review outputs are identical: {template_name}/{final.name}")

gitmodules = require_file(Path(".gitmodules"))
if gitmodules.count("[submodule ") != 1:
    fail("repository must contain exactly one submodule")
if '[submodule "darkfactory"]' not in gitmodules or "marius-patrik/DarkFactory.git" not in gitmodules:
    fail("darkfactory must be the sole submodule and target marius-patrik/DarkFactory")

required_sources = (
    Path("main.typ"),
    Path("review.typ"),
    Path("web-publication.typ"),
    Path("books.typ"),
    ROOT / "book.typ",
    ROOT / "metadata.typ",
    ROOT / "thesis.typ",
    ROOT / "web-publication.typ",
    ROOT / "schema.typ",
    ROOT / "index.typ",
    ROOT / "templates/common.typ",
    ROOT / "templates/registry.typ",
    ROOT / "templates/terms.typ",
    Path("web/package.json"),
    Path("web/rsbuild.config.ts"),
    Path("web/src/app.tsx"),
    Path("web/src/pdf-document.tsx"),
    Path("web/src/workspace.tsx"),
    Path("web/src/main.tsx"),
    Path("web/src/viewer.css"),
    Path("scripts/build_review.py"),
    Path("scripts/build_web_exports.py"),
    Path("scripts/build_site.py"),
)
sources = {path: require_file(path) for path in required_sources if path.suffix != ".jpeg"}

books = sources[Path("books.typ")]
for contract in (
    "#let default-book",
    "#let available-books",
    "#let default-template-for(name)",
    "#let render-pdf(name, ..args)",
    "#let render-web(name, ..args)",
):
    if contract not in books:
        fail(f"book registry is missing contract: {contract}")

if f'"{BOOK}"' not in books:
    fail(f"selected book is not registered in books.typ: {BOOK}")

book = sources[ROOT / "book.typ"]
for contract in ("root.key", "root.title", "default-template-name", "render-pdf", "render-web"):
    if contract not in book:
        fail(f"book interface is missing contract: {contract}")

catalog = sources[ROOT / "index.typ"]
for contract in (
    "#let root = folder(",
    f'key: "{BOOK}"',
    "title: translation(",
    "#let book-title = root.title",
    "#let vocabulary = build-vocabulary(folders)",
    "#let render-introduction()",
    "#let render-theory()",
    "#let render-practical()",
    "#let render-results()",
    "#let render-conclusion()",
    "#let render-appendices()",
):
    if contract not in catalog:
        fail(f"book structure is missing contract: {contract}")

schema = sources[ROOT / "schema.typ"]
for contract in (
    "#let concept(",
    "#let folder(",
    "title: none",
    "#let relation(",
    "#let build-vocabulary(folders)",
    "#let render-section-title(item) = context",
    'surface: "proper"',
    'profile in ("school", "cs")',
):
    if contract not in schema:
        fail(f"concept schema is missing contract: {contract}")

common = sources[ROOT / "templates/common.typ"]
for contract in (
    "alias: none",
    'surface: "full"',
    '#let term-name(value, surface: "full", language: "auto")',
    'surface in ("full", "industry", "proper", "alias")',
):
    if contract not in common:
        fail(f"terminology surface is missing contract: {contract}")

all_book_typ = tuple(sorted(ROOT.rglob("*.typ")))
concept_files = tuple(
    path
    for path in all_book_typ
    if "#let item = concept(" in path.read_text(encoding="utf-8")
)
folder_manifests = tuple(
    path
    for path in all_book_typ
    if path.name == "index.typ"
    and path != ROOT / "index.typ"
    and "#let node = folder(" in path.read_text(encoding="utf-8")
)

if not concept_files:
    fail(f"book contains no canonical concept records: {BOOK}")
if not folder_manifests:
    fail(f"book contains no structural folder manifests: {BOOK}")
if BOOK == "DarkFactory" and len(concept_files) < 45:
    fail(f"DarkFactory concept catalog is unexpectedly small: {len(concept_files)} concept files")

concept_keys: list[str] = []
term_ids: list[str] = []
for path in concept_files:
    source = path.read_text(encoding="utf-8")
    if "#let terminology = define-term(" not in source:
        fail(f"concept file does not own canonical terminology: {path}")
    key = re.search(r'key:\s*"([^"]+)"', source)
    term_id = re.search(r'id:\s*"([^"]+)"', source)
    if key is None or term_id is None:
        fail(f"concept file is missing stable key or term id: {path}")
    concept_keys.append(key.group(1))
    term_ids.append(term_id.group(1))

if len(concept_keys) != len(set(concept_keys)):
    fail("concept keys must be unique within a book")
if len(term_ids) != len(set(term_ids)):
    fail("term ids must be unique within a book")

for manifest_path in folder_manifests:
    source = manifest_path.read_text(encoding="utf-8")
    if "#let node = folder(" not in source:
        fail(f"book folder index must declare a folder node: {manifest_path}")

if BOOK == "DarkFactory":
    for required in (
        ROOT / "bib/references.bib",
        ROOT / "img/logo.jpeg",
        ROOT / "manuscript/introduction/index.typ",
        ROOT / "manuscript/results/index.typ",
        ROOT / "manuscript/conclusion/index.typ",
        ROOT / "manuscript/appendices/index.typ",
        ROOT / "development-environment/index.typ",
        ROOT / "language-models/index.typ",
        ROOT / "agentic-engineering/index.typ",
    ):
        if not required.is_file():
            fail(f"DarkFactory book is missing required publication component: {required}")

package = json.loads(sources[Path("web/package.json")])
dependencies = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
for dependency in (
    "react",
    "react-dom",
    "typescript",
    "@rsbuild/core",
    "@rsbuild/plugin-react",
    "@biomejs/biome",
    "pdfjs-dist",
    "dockview-react",
    "lucide-animated",
    "lucide-react",
):
    if dependency not in dependencies:
        fail(f"web application is missing dependency: {dependency}")

app = sources[Path("web/src/app.tsx")]
workspace = sources[Path("web/src/workspace.tsx")]
pdf_viewer = sources[Path("web/src/pdf-document.tsx")]
for contract in (
    'type ActivityBarPosition = "left" | "right" | "top" | "bottom"',
    'label="Structure"',
    'label="Explorer"',
    "<ReviewWorkspace",
    "<SplitViewPicker",
    "<FileMenu",
    "<AppearancePicker",
    'className="zoom-value"',
):
    if contract not in app:
        fail(f"viewer shell is missing UI contract: {contract}")

for contract in ("DockviewReact", "paper-viewer-workspace-layout", "splitActive", "updateActive", "onDidLayoutChange"):
    if contract not in workspace:
        fail(f"review workspace is missing contract: {contract}")

for contract in ('aria-label="Document structure"', "chaptersByPage", "structure-page-group", "sidebarWidth", "onSidebarWidthChange"):
    if contract not in pdf_viewer:
        fail(f"PDF structure viewer is missing contract: {contract}")

manifest = json.loads(require_file(Path(".github/darkfactory.json")))
release_assets = {Path(value) for value in manifest.get("release", {}).get("assets", [])}
if release_assets != set(EXPECTED):
    fail("release asset list must exactly match the canonical publication matrix")

print(
    f"ok: {BOOK}: {len(EXPECTED)} canonical artifacts, {len(template_names)} template matrix/matrices, "
    f"{len(concept_files)} concepts, terminology surfaces, and web workbench validated"
)
