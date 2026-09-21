#!/usr/bin/env python3
"""Positive validation for the selected book and generated publication matrix."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

BOOK = os.environ.get("BOOK", "DarkFactory")
ROOT = Path(BOOK)
EXPECTED_PDFS = (Path("out/prace.pdf"), Path("out/prace-review.pdf"))
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


def require_present(path: Path, minimum_size: int = 1) -> None:
    if not path.is_file():
        fail(f"missing required file: {path}")
    if path.stat().st_size < minimum_size:
        fail(f"required file is unexpectedly small: {path}")


def require_contract(source: str, contracts: tuple[str, ...], label: str) -> None:
    missing = [contract for contract in contracts if contract not in source]
    if missing:
        fail(f"{label} is missing contracts: {missing}")


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

for html_path in EXPECTED_HTML:
    source = html_path.read_text(encoding="utf-8")
    refs = re.findall(
        r'<(?:img|image)\b[^>]*?\b(?:src|href)="([^"]+)"',
        source,
        flags=re.IGNORECASE,
    )
    if not refs:
        fail(f"HTML publication contains no rendered image references: {html_path}")
    for ref in refs:
        if ref.startswith(("data:", "http://", "https://")):
            continue
        local = html_path.parent / ref.split("#", 1)[0].split("?", 1)[0]
        if not local.is_file():
            fail(f"HTML publication references missing image asset: {local}")

for markdown_path in EXPECTED_MARKDOWN:
    source = markdown_path.read_text(encoding="utf-8")
    if "assets/" not in source and "<image" not in source and "data:image/" not in source:
        fail(f"Markdown publication contains no rendered image references: {markdown_path}")

if not ROOT.is_dir():
    fail(f"selected book root does not exist: {ROOT}")

template_names = tuple(
    sorted(path.parent.name for path in (ROOT / "templates").glob("*/template.typ"))
)
if not template_names:
    fail(f"no document templates discovered under {ROOT / 'templates'}")

for template_name in template_names:
    template_out = Path("out/templates") / template_name
    for artifact in EXPECTED:
        validate_publication(template_out / artifact.name)

gitmodules = require_file(Path(".gitmodules"))
require_contract(
    gitmodules,
    ('[submodule "darkfactory"]', "marius-patrik/DarkFactory.git"),
    ".gitmodules",
)

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
    ROOT / "templates/gjkt-odborna-prace/template.typ",
    Path("web/package.json"),
    Path("web/rsbuild.config.ts"),
    Path("web/src/app.tsx"),
    Path("web/src/compiled-artifact.tsx"),
    Path("web/src/pdf-document.tsx"),
    Path("web/src/workspace.tsx"),
    Path("web/src/settings.ts"),
    Path("web/src/settings-view.tsx"),
    Path("web/src/viewer-tabs.tsx"),
    Path("web/src/viewer-ui.tsx"),
    Path("web/src/main.tsx"),
    Path("web/src/viewer.css"),
    Path("scripts/build_review.py"),
    Path("scripts/build_web_exports.py"),
    Path("scripts/build_site.py"),
    Path("scripts/fetch_external_assets.py"),
)
sources = {path: require_file(path) for path in required_sources}

books = sources[Path("books.typ")]
require_contract(
    books,
    (
        "#let default-book",
        "#let available-books",
        "#let default-template-for(name)",
        "#let render-pdf(name, ..args)",
        "#let render-web(name, ..args)",
        f'"{BOOK}"',
    ),
    "book registry",
)

book = sources[ROOT / "book.typ"]
require_contract(
    book,
    ("root.key", "root.title", "default-template-name", "render-pdf", "render-web"),
    "book interface",
)

school_template = sources[ROOT / "templates/gjkt-odborna-prace/template.typ"]
require_contract(
    school_template,
    (
        "heading(numbering: none, outlined: true, bookmarked: false, text-nadpisu)",
        "bibliography(bibliografie, style: bib-styl, title: none, full: true)",
        "outline(title: ui-label([Obsah], [Contents]), depth: 99, indent: 1.4em)",
    ),
    "school template",
)

catalog = sources[ROOT / "index.typ"]
require_contract(
    catalog,
    (
        "#let root = folder(",
        f'key: "{BOOK}"',
        "Agentic AI, Agentic Engineering and Harness Engineering",
        "#let manuscript-folders",
        "#let appendix-folders",
        "#let book-title = root.title",
        "#let vocabulary = build-vocabulary(folders)",
        "#let render-manuscript()",
        "#let render-appendices()",
    ),
    "book structure",
)

schema = sources[ROOT / "schema.typ"]
require_contract(
    schema,
    (
        "#let concept(",
        "industry: none",
        "czech: none",
        "english: none",
        "alias: none",
        "keyword: false",
        "definition: none",
        "description: none",
        "examples: ()",
        "attachments: ()",
        "#let folder(",
        "#let relation(",
        "#let collect-concepts(folders)",
        "#let build-vocabulary(folders)",
        "#let render-concept-title(item) = {",
        "#let render-inline-example(item, terms, graph)",
        "#let render-concept(item, terms, graph, level: 1, title: none)",
        "if level >= 4 {",
        "heading(level: level, numbering: none, outlined: true)",
    ),
    "concept schema",
)

common = sources[ROOT / "templates/common.typ"]
require_contract(
    common,
    (
        "#let term-full-name(value) = {",
        '#let term-name(value, surface: "full", language: "auto") = {',
        '#let render-keywords(items) = context',
        "items.filter(item => item.keyword)",
    ),
    "terminology renderer",
)

all_book_typ = tuple(sorted(ROOT.rglob("*.typ")))
concept_files = tuple(
    path for path in all_book_typ if "#let item = concept(" in path.read_text(encoding="utf-8")
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

concept_keys: list[str] = []
keyword_keys: list[str] = []
for path in concept_files:
    source = path.read_text(encoding="utf-8")
    require_contract(source, ("definition:", "description:", "key:"), f"concept {path}")
    if not any(
        re.search(rf"{field}:\s*(?!none\b)", source)
        for field in ("industry", "czech", "english")
    ):
        fail(f"concept file is missing terminology slots: {path}")
    key = re.search(r'key:\s*"([^"]+)"', source)
    if key is None:
        fail(f"concept file is missing stable key: {path}")
    concept_keys.append(key.group(1))
    keyword = re.search(r"keyword:\s*(true|false)\b", source)
    if keyword is not None and keyword.group(1) == "true":
        keyword_keys.append(key.group(1))

if len(concept_keys) != len(set(concept_keys)):
    fail("concept keys must be unique within a book")
if BOOK == "DarkFactory" and not 5 <= len(keyword_keys) <= 20:
    fail(f"DarkFactory keyword curation is unexpectedly sized: {len(keyword_keys)} keyword concepts")

for manifest_path in folder_manifests:
    source = manifest_path.read_text(encoding="utf-8")
    require_contract(source, ("#let node = folder(",), f"folder manifest {manifest_path}")

if BOOK == "DarkFactory":
    expected_structure = {
        ROOT / "manuscript/theory/index.typ": (
            "manuscript/theory/introduction/index.typ",
            "software-engineering/index.typ",
            "language-models/index.typ",
            "agentic-engineering/agent-harness/index.typ",
            "agentic-engineering/index.typ",
        ),
        ROOT / "manuscript/practical/index.typ": (
            "manuscript/practical/introduction/index.typ",
            "manuscript/practical/harness-engineering/index.typ",
            "manuscript/practical/darkfactory-architecture/index.typ",
            "manuscript/results/index.typ",
        ),
        ROOT / "software-engineering/index.typ": (
            "vibe-coding.typ",
            "slop.typ",
            "spec-driven-development.typ",
            "planning.typ",
            "version-control.typ",
            "github.typ",
            "runtime.typ",
            "continuous-integration.typ",
            "github-actions.typ",
            "container.typ",
            "integration-test.typ",
        ),
        ROOT / "language-models/index.typ": (
            "language-model/language-model.typ",
            "language-model/context-rot.typ",
        ),
        ROOT / "agentic-engineering/agent-harness/index.typ": (
            "agent-harness/turn.typ",
            "agent-harness/session-management.typ",
            "agent-harness/transcript.typ",
            "agent-harness/tools/index.typ",
            "agent-harness/skills/index.typ",
            "agent-harness/scripts/index.typ",
            "agent-harness/hooks/index.typ",
        ),
        ROOT / "agentic-engineering/index.typ": (
            "guardrail.typ",
            "human-in-the-loop.typ",
            "sandbox.typ",
            "prompt-engineering/index.typ",
            "loop-engineering/index.typ",
            "graph-engineering/index.typ",
            "context-engineering/index.typ",
        ),
    }
    for path, contracts in expected_structure.items():
        source = require_file(path)
        require_contract(source, contracts, f"final hierarchy {path}")

    for required in (
        ROOT / "bib/references.bib",
        ROOT / "img/logo.jpeg",
        ROOT / "img/vector-embedding-queen.svg",
        ROOT / "manuscript/introduction/index.typ",
        ROOT / "manuscript/theory/introduction/index.typ",
        ROOT / "manuscript/practical/introduction/index.typ",
        ROOT / "manuscript/practical/harness-engineering/index.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/index.typ",
        ROOT / "manuscript/results/index.typ",
        ROOT / "manuscript/conclusion/index.typ",
        ROOT / "manuscript/appendices/index.typ",
        ROOT / "agentic-engineering/agent-harness/tools/tools.typ",
        ROOT / "agentic-engineering/agent-harness/skills/skills.typ",
        ROOT / "agentic-engineering/agent-harness/scripts/scripts.typ",
        ROOT / "agentic-engineering/agent-harness/hooks/hooks.typ",
        ROOT / "agentic-engineering/agent-harness/transcript.typ",
        ROOT / "software-engineering/examples/karpathy-vibe-coding-tweet.typ",
        ROOT / "img/external/karpathy-vibe-coding.png",
    ):
        require_present(required)

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
require_contract(
    app,
    (
        "publication.json",
        "manifest?.publication",
        'label="Structure"',
        'label="Explorer"',
        "<ReviewWorkspace",
        "<SplitViewPicker",
        "<FileMenu",
        "DropdownMenuSubTrigger",
        "Appearance",
        "SourceFileView",
        "onOpenFile={openRepositoryFile}",
        'className="zoom-value"',
        "<AppTabBar",
        "<SettingsView",
        "active.extension",
    ),
    "viewer shell",
)

settings = sources[Path("web/src/settings.ts")]
require_contract(
    settings,
    (
        'export type ActivityBarPosition = "left" | "right" | "top" | "bottom"',
        'export type AppearanceMode = "light" | "dark" | "oled"',
        "showRefresh: boolean",
        "showFullscreen: boolean",
        "export function useViewerSettings()",
    ),
    "viewer settings",
)

settings_view = sources[Path("web/src/settings-view.tsx")]
require_contract(
    settings_view,
    ("Refresh button", "Fullscreen button", "Synchronize split scrolling"),
    "settings view",
)

viewer_tabs = sources[Path("web/src/viewer-tabs.tsx")]
require_contract(
    viewer_tabs,
    ('role="tablist"', 'role="tab"', 'label="New tab"', "app-tab-close"),
    "tab bar",
)

compiled_artifact = sources[Path("web/src/compiled-artifact.tsx")]
require_contract(
    compiled_artifact,
    (
        "function publicationUrlTransform(url: string)",
        "data:image",
        "urlTransform={publicationUrlTransform}",
    ),
    "compiled Markdown renderer",
)

workspace = sources[Path("web/src/workspace.tsx")]
require_contract(
    workspace,
    ("DockviewReact", "paper-viewer-workspace-layout", "splitActive", "updateActive", "onDidLayoutChange"),
    "review workspace",
)

pdf_viewer = sources[Path("web/src/pdf-document.tsx")]
require_contract(
    pdf_viewer,
    ('aria-label="Document structure"', "chaptersByPage", "structure-page-group", "sidebarWidth", "onSidebarWidthChange"),
    "PDF structure viewer",
)

web_exports = sources[Path("scripts/build_web_exports.py")]
require_contract(
    web_exports,
    ("localize_image_assets", "validate_local_image_references", '"assets/"'),
    "web export image pipeline",
)

site_builder = sources[Path("scripts/build_site.py")]
require_contract(
    site_builder,
    (
        "publish_tracked_sources",
        "publish_compiled_assets",
        '"publication": PUBLICATION',
        '"repository_source_root": "repository/"',
        '"type": "submodule"',
    ),
    "site builder",
)

manifest = json.loads(require_file(Path(".github/darkfactory.json")))
release_assets = {Path(value) for value in manifest.get("release", {}).get("assets", [])}
if release_assets != set(EXPECTED):
    fail("release asset list must exactly match the canonical publication artifact set")

print(
    f"ok: {BOOK}: {len(EXPECTED)} canonical artifacts, {len(template_names)} template(s), "
    f"{len(concept_files)} concepts, final hierarchy and web workbench validated"
)
