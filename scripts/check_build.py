#!/usr/bin/env python3
"""Positive validation for the consolidated DarkFactory paper and generated publication matrix."""

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


def require_in_order(source: str, contracts: tuple[str, ...], label: str) -> None:
    cursor = -1
    for contract in contracts:
        position = source.find(contract, cursor + 1)
        if position < 0:
            fail(f"{label} is missing ordered contract: {contract!r}")
        if position <= cursor:
            fail(f"{label} has out-of-order contract: {contract!r}")
        cursor = position


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

gitmodules = require_file(Path(".gitmodules"))
require_contract(
    gitmodules,
    ('[submodule "darkfactory"]', "marius-patrik/DarkFactory.git"),
    ".gitmodules",
)

required_sources = (
    Path("main.typ"),
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

main_source = sources[Path("main.typ")]
require_contract(
    main_source,
    (
        "AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory",
        "#let terms = (",
        'agent_loop: (key: "agent_loop"',
        'language_model: (key: "language_model"',
        'mcp: (key: "mcp"',
        'state: (key: "state"',
        'tools: (key: "tools"',
        'subagent: (key: "subagent"',
        'swarm: (key: "swarm"',
        'DarkFactory',
        '#bibliography("/DarkFactory/bib/references.bib"',
        '<callout>',
        '<word-stats>',
    ),
    "main.typ consolidated manuscript",
)

require_in_order(
    main_source,
    (
        "Úvod",
        "Motivace a vymezení problému",
        "Východisko a argument práce",
        "Cíle",
        "Výzkumné otázky",
        "Metodika",
        "Jazykový model",
        "Architektura a reprezentace",
        "Inference",
        "Harness",
        "Smyčka a stav",
        "Prostředí a nástroje",
        "Rozšíření",
        "AI-asistovaný vývoj a agentické inženýrství",
        "Zadání a způsob práce",
        "Řízení změny",
        "Kvalita a ověřování",
        "Instrukce a kontext",
        "Řízení agentního chování",
        "Orchestrace agentů",
        "DarkFactory",
        "Vyhodnocení",
        "Ověření mechanismů",
        "Ověření systému",
        "Ověření na repozitářích",
        "Výzkumné otázky",
        "Diskuse a omezení",
        "Závěr",
        "Seznam zdrojů",
        "Seznam obrázků a tabulek",
        "Seznam příloh",
        "Encyklopedie a rejstřík pojmů",
    ),
    "main.typ canonical section order",
)

for required in (
    ROOT / "bib/references.bib",
    ROOT / "img/logo.jpeg",
    ROOT / "img/vector-embedding-queen.svg",
    ROOT / "img/vector-embedding-3d.svg",
    ROOT / "fonts/Caladea-Regular.ttf",
    ROOT / "fonts/Caladea-Bold.ttf",
):
    require_present(required)

site_builder = sources[Path("scripts/build_site.py")]
require_contract(
    site_builder,
    ("class HeadingIndexParser", "def semantic_content_index", '"content_index": "content-index.json"'),
    "semantic web structure index",
)

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
    f"ok: {BOOK}: {len(EXPECTED)} canonical artifacts, single-file consolidated manuscript main.typ, "
    f"and web workbench validated"
)
