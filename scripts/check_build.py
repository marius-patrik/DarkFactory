#!/usr/bin/env python3
"""Positive validation for the generated DarkFactory-Paper publication."""

from __future__ import annotations

import json
import re
from pathlib import Path

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

template_names = tuple(
    sorted(path.parent.name for path in Path("templates").glob("*/template.typ"))
)
if not template_names:
    fail("no document templates discovered")

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
    Path("thesis.typ"),
    Path("web-publication.typ"),
    Path("metadata.typ"),
    Path("templates/common.typ"),
    Path("templates/registry.typ"),
    Path("templates/terms.typ"),
    Path("concepts/schema.typ"),
    Path("concepts/index.typ"),
    Path("concepts/manuscript/introduction/index.typ"),
    Path("concepts/manuscript/results/index.typ"),
    Path("concepts/manuscript/conclusion/index.typ"),
    Path("concepts/manuscript/appendices/index.typ"),
    Path("concepts/development-environment/index.typ"),
    Path("concepts/language-models/index.typ"),
    Path("concepts/agentic-engineering/index.typ"),
    Path("web/package.json"),
    Path("web/rsbuild.config.ts"),
    Path("web/src/app.tsx"),
    Path("web/src/pdf-document.tsx"),
    Path("web/src/workspace.tsx"),
    Path("web/src/main.tsx"),
    Path("web/src/viewer.css"),
    Path("scripts/build_web_exports.py"),
    Path("scripts/build_site.py"),
)
sources = {path: require_file(path) for path in required_sources}

schema = sources[Path("concepts/schema.typ")]
for contract in (
    "#let concept(",
    "#let folder(",
    "#let relation(",
    "#let build-vocabulary(folders)",
    "#let render-document-chapter(node, terms)",
    "#let render-folders(folders, terms, mode, level: 2)",
    "#let render-theory-chapter(folders, terms)",
    "#let render-practical-chapter(folders, terms)",
):
    if contract not in schema:
        fail(f"concept schema is missing contract: {contract}")

catalog = sources[Path("concepts/index.typ")]
for contract in (
    '"manuscript/introduction/index.typ"',
    '"manuscript/results/index.typ"',
    '"manuscript/conclusion/index.typ"',
    '"manuscript/appendices/index.typ"',
    '"development-environment/index.typ"',
    '"language-models/index.typ"',
    '"agentic-engineering/index.typ"',
    "#let vocabulary = build-vocabulary(folders)",
    "#let render-introduction()",
    "#let render-theory()",
    "#let render-practical()",
    "#let render-results()",
    "#let render-conclusion()",
    "#let render-appendices()",
):
    if contract not in catalog:
        fail(f"concept catalog is missing contract: {contract}")

concept_files = tuple(
    sorted(
        path
        for path in Path("concepts").rglob("*.typ")
        if path.name != "index.typ"
        and path not in (Path("concepts/schema.typ"), Path("concepts/index.typ"))
    )
)
if len(concept_files) < 38:
    fail(f"concept catalog is unexpectedly small: {len(concept_files)} concept files")

concept_keys: list[str] = []
term_ids: list[str] = []
for path in concept_files:
    source = path.read_text(encoding="utf-8")
    if "#let terminology = define-term(" not in source or "#let item = concept(" not in source:
        fail(f"concept file does not own terminology and a concept record: {path}")

    key = re.search(r'key:\s*"([^"]+)"', source)
    term_id = re.search(r'id:\s*"([^"]+)"', source)
    if key is None or term_id is None:
        fail(f"concept file is missing stable key or term id: {path}")
    concept_keys.append(key.group(1))
    term_ids.append(term_id.group(1))

if len(concept_keys) != len(set(concept_keys)):
    fail("concept keys must be unique")
if len(term_ids) != len(set(term_ids)):
    fail("term ids must be unique")

for manifest in sorted(Path("concepts").rglob("index.typ")):
    if manifest == Path("concepts/index.typ"):
        continue
    source = manifest.read_text(encoding="utf-8")
    if "#let node = folder(" not in source:
        fail(f"concept folder index must declare a folder node: {manifest}")

thesis = sources[Path("thesis.typ")]
web_publication = sources[Path("web-publication.typ")]
for entrypoint_name, entrypoint in (
    ("thesis.typ", thesis),
    ("web-publication.typ", web_publication),
):
    if '"concepts/index.typ"' not in entrypoint:
        fail(f"{entrypoint_name} must import the concept catalog")
    for renderer in (
        "render-introduction",
        "render-theory",
        "render-practical",
        "render-results",
        "render-conclusion",
        "render-appendices",
    ):
        if f"#{renderer}()" not in entrypoint:
            fail(f"{entrypoint_name} must render {renderer}()")

terms_projection = sources[Path("templates/terms.typ")]
if '#import "../concepts/index.typ" as catalog' not in terms_projection:
    fail("templates/terms.typ must project the concept catalog vocabulary")
if "#let vocabulary = catalog.vocabulary" not in terms_projection:
    fail("templates/terms.typ must export catalog.vocabulary")

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

scripts = package.get("scripts", {})
for script, token in (
    ("dev", "rsbuild dev"),
    ("build", "rsbuild build"),
    ("lint", "biome lint"),
    ("check", "tsc --noEmit"),
):
    if token not in scripts.get(script, ""):
        fail(f"web script {script!r} must include {token!r}")

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

for contract in (
    "DockviewReact",
    "paper-viewer-workspace-layout",
    "splitActive",
    "updateActive",
    "onDidLayoutChange",
):
    if contract not in workspace:
        fail(f"review workspace is missing contract: {contract}")

for contract in (
    'aria-label="Document structure"',
    "chaptersByPage",
    "structure-page-group",
    "sidebarWidth",
    "onSidebarWidthChange",
):
    if contract not in pdf_viewer:
        fail(f"PDF structure viewer is missing contract: {contract}")

main_source = sources[Path("web/src/main.tsx")]
if 'dockview-react/dist/styles/dockview.css' not in main_source:
    fail("web entrypoint must load Dockview styles")

manifest = json.loads(require_file(Path(".github/darkfactory.json")))
release_assets = {Path(value) for value in manifest.get("release", {}).get("assets", [])}
if release_assets != set(EXPECTED):
    fail("release asset list must exactly match the canonical publication matrix")

print(
    f"ok: {len(EXPECTED)} canonical artifacts, {len(template_names)} template matrix/matrices, "
    f"{len(concept_files)} concepts, and the web workbench validated"
)
