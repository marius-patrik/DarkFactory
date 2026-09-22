#!/usr/bin/env python3
"""Positive validation for the single-source DarkFactory paper and publication matrix."""

from __future__ import annotations

import json
import os
import re
import subprocess
from pathlib import Path

BOOK = os.environ.get("BOOK", "paper")
if BOOK == "DarkFactory" and not (Path("DarkFactory") / "PAPER.typ").exists() and Path("paper").exists():
    BOOK = "paper"
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

paper_file = ROOT / "PAPER.typ" if (ROOT / "PAPER.typ").exists() else Path("PAPER.typ")

required_sources = (
    paper_file,
    Path("Makefile"),
    Path("web/package.json"),
    Path("web/rsbuild.config.ts"),
    Path("web/src/app.tsx"),
    Path("web/src/settings.ts"),
    Path("web/src/settings-view.tsx"),
    Path("web/src/main.tsx"),
    Path("web/src/workbench.css"),
    Path("web/src/workbench/model.ts"),
    Path("web/src/workbench/registry.tsx"),
    Path("web/src/workbench/runtime.tsx"),
    Path("web/src/workbench/shell.tsx"),
    Path("web/src/workbench/surface.tsx"),
    Path("web/src/workbench/commands.ts"),
    Path("web/src/workbench/persistence.ts"),
    Path("web/src/workbench/launcher.tsx"),
    Path("web/src/workbench/omnibar.tsx"),
    Path("web/src/workbench/empty-workbench.tsx"),
    Path("web/src/tabs/editor-tab.tsx"),
    Path("web/src/tabs/browser-tab.tsx"),
    Path("web/src/tabs/explorer-tab.tsx"),
    Path("web/src/tabs/source-control-tab.tsx"),
    Path("web/src/tabs/search-tab.tsx"),
    Path("web/src/tabs/problems-tab.tsx"),
    Path("web/src/tabs/output-tab.tsx"),
    Path("web/src/tabs/tab-shell.tsx"),
    Path("web/src/compiled-artifact.tsx"),
    Path("web/src/pdf-document.tsx"),
    Path("scripts/build_review.py"),
    Path("scripts/build_web_exports.py"),
    Path("scripts/build_site.py"),
    Path("scripts/fetch_external_assets.py"),
)
sources = {path: require_file(path) for path in required_sources}

main_source = sources[paper_file]
require_contract(
    main_source,
    (
        "Agentický vývoj softwaru: návrh a ověření harnessu DarkFactory",
        "DarkFactory",
        '#bibliography("bib/references.bib"',
        "<callout>",
        "<word-stats>",
    ),
    f"{paper_file} manuscript",
)

tracked = subprocess.run(
    ["git", "ls-files"],
    check=True,
    capture_output=True,
    text=True,
).stdout.splitlines()
tracked_typst = sorted(Path(path) for path in tracked if path.endswith(".typ"))
if tracked_typst != [paper_file]:
    fail(f"{paper_file} must be the only authored Typst source, found: {tracked_typst}")

if Path("scripts/consolidate_paper.py").exists():
    fail("obsolete consolidation script still exists")

makefile = sources[Path("Makefile")]
for stale in ("consolidate:", "scripts/consolidate_paper.py", "make consolidate", "web-publication.typ"):
    if stale in makefile:
        fail(f"Makefile still contains obsolete single-file transition contract: {stale}")

body_start = main_source.find('#metadata("body-start")')
body_end = main_source.find('#metadata("body-end")')
if body_start < 0 or body_end <= body_start:
    fail(f"{paper_file} body markers are missing or out of order")
body_source = main_source[body_start:body_end]

heading_pattern = re.compile(
    r"^#heading\(level:\s*(\d+)(?P<options>[^)]*)\)\[(?P<title>[^\]]+)\]",
    flags=re.MULTILINE,
)
headings = [
    (int(match.group(1)), match.group("title"), match.group("options"))
    for match in heading_pattern.finditer(body_source)
]
structural = [
    (level, title)
    for level, title, options in headings
    if "numbering: none" not in options
]
expected_structural = [
    (1, "Úvod"),
    (2, "Motivace a vymezení problému"),
    (2, "Cíl práce a výzkumné otázky"),
    (2, "Metodika"),
    (1, "Teoretická část"),
    (2, "Jazykový model"),
    (3, "Architektura a reprezentace"),
    (3, "Inference a kontext"),
    (2, "Harness"),
    (3, "Smyčka a stav"),
    (3, "Prostředí a nástroje"),
    (3, "Rozšíření"),
    (2, "Agentické inženýrství"),
    (3, "Zadání a plánování"),
    (3, "Řízení změny a ověřování"),
    (3, "Instrukce, kontext a autonomie"),
    (3, "Orchestrace"),
    (1, "Praktická část"),
    (2, "DarkFactory"),
    (1, "Výsledky a diskuse"),
    (2, "Ověření implementace a systému"),
    (2, "Ověření na repozitářích"),
    (2, "Odpovědi na výzkumné otázky"),
    (2, "Diskuse a omezení"),
    (1, "Závěr"),
]
if structural != expected_structural:
    fail(f"numbered manuscript hierarchy differs from contract: {structural}")

top_level = [title for level, title in structural if level == 1]
if top_level != ["Úvod", "Teoretická část", "Praktická část", "Výsledky a diskuse", "Závěr"]:
    fail(f"unexpected top-level manuscript hierarchy: {top_level}")

max_depth = max(level for level, _, _ in headings)
if max_depth > 3:
    fail(f"maximum numbered heading depth is 3, found level {max_depth}")
if any("numbering: none" in options for _, _, options in headings):
    fail("body headings must be numbered structural headings")

intro_start = body_source.find("#heading(level: 1)[Úvod]")
theory_start = body_source.find("#heading(level: 1)[Teoretická část]")
practical_start = body_source.find("#heading(level: 1)[Praktická část]")
results_start = body_source.find("#heading(level: 1)[Výsledky a diskuse]")
if min(intro_start, theory_start, practical_start, results_start) < 0:
    fail("required manuscript ownership boundary is missing")
introduction = body_source[intro_start:theory_start]
theory = body_source[theory_start:practical_start]
practical = body_source[practical_start:results_start]

if "Vibe Coding" not in introduction:
    fail("Vibe Coding must be mentioned in Introduction")
if "Agentické inženýrství" not in theory:
    fail("Agentické inženýrství must belong to Theory")
if "DarkFactory" not in practical:
    fail("DarkFactory must belong to Practical")

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
    (
        "class HeadingIndexParser",
        "def typst_manuscript_index",
        "MANUSCRIPT_TOP_LEVEL",
        "def semantic_content_index",
        '"content_index": "content-index.json"',
    ),
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
    ("WorkbenchShell",),
    "workbench entry point",
)

settings = sources[Path("web/src/settings.ts")]
require_contract(
    settings,
    (
        'export type AppearanceMode = "light" | "dark" | "oled"',
        "export type WorkbenchSettings",
        "export function useWorkbenchSettings()",
    ),
    "workbench settings",
)

settings_view = sources[Path("web/src/settings-view.tsx")]
require_contract(
    settings_view,
    ("Workbench settings", "Appearance", "Light", "Dark", "OLED"),
    "settings view",
)

model = sources[Path("web/src/workbench/model.ts")]
require_contract(
    model,
    (
        'export type WorkbenchSurface = "primary" | "main" | "secondary" | "panel"',
        "export type WorkbenchTabType",
        "export type WorkbenchTab =",
        "pinned: boolean",
        "state: SerializableTabState",
        "export type PersistedWorkbench",
        "version: 1",
    ),
    "unified workbench tab model",
)

registry = sources[Path("web/src/workbench/registry.tsx")]
require_contract(
    registry,
    (
        "TAB_REGISTRY",
        "createWorkbenchTab",
        '"editor"',
        '"browser"',
        '"explorer"',
        '"source-control"',
        '"search"',
        '"problems"',
        '"output"',
        '"settings"',
        '"document"',
    ),
    "workbench tab registry",
)

shell = sources[Path("web/src/workbench/shell.tsx")]
require_contract(
    shell,
    (
        "WorkbenchRuntimeContext.Provider",
        'surface="primary"',
        'surface="main"',
        'surface="secondary"',
        'surface="panel"',
        'createWorkbenchTab("explorer", { id: "explorer", pinned: true })',
        'createWorkbenchTab("search", { id: "search", pinned: true })',
        'createWorkbenchTab("source-control", { id: "source-control", pinned: true })',
        'createWorkbenchTab("problems", { id: "problems", pinned: true })',
        'createWorkbenchTab("output", { id: "output", pinned: true })',
        "useWorkbenchShortcuts",
        "<Omnibar",
    ),
    "four-surface workbench shell",
)

surface = sources[Path("web/src/workbench/surface.tsx")]
require_contract(
    surface,
    (
        "DockviewReact",
        "LauncherButton",
        "api.fromJSON",
        "api.onDidLayoutChange",
        "rightHeaderActionsComponent",
    ),
    "Dockview workbench surface",
)

commands = sources[Path("web/src/workbench/commands.ts")]
require_contract(
    commands,
    (
        'key === "b"',
        "event.altKey",
        'key === "j"',
        'key === "p"',
        "event.shiftKey",
        "event.defaultPrevented",
    ),
    "central workbench shortcuts",
)

persistence = sources[Path("web/src/workbench/persistence.ts")]
require_contract(
    persistence,
    (
        'const STORAGE_KEY = "workbench-layout-v1"',
        "version: 1",
        "loadWorkbench",
        "saveWorkbench",
    ),
    "versioned workbench persistence",
)

launcher = sources[Path("web/src/workbench/launcher.tsx")]
require_contract(
    launcher,
    (
        "LAUNCHER_ENTRIES",
        '"Files"',
        '"Git"',
        '"Tools"',
        '"Workspace"',
        "LauncherButton",
    ),
    "universal tab launcher",
)

omnibar = sources[Path("web/src/workbench/omnibar.tsx")]
require_contract(
    omnibar,
    (
        'query.startsWith(">")',
        'query.startsWith("@")',
        'query.startsWith("#")',
        'query.startsWith(":")',
        '"command"',
        '"url"',
        "runtime.openTab",
    ),
    "omnibar shell",
)

editor_tab = sources[Path("web/src/tabs/editor-tab.tsx")]
require_contract(
    editor_tab,
    ("<Editor", 'language={language}', "onChange=", "automaticLayout"),
    "generic editor tab",
)

browser_tab = sources[Path("web/src/tabs/browser-tab.tsx")]
require_contract(
    browser_tab,
    (
        "<iframe",
        'aria-label="Back"',
        'aria-label="Forward"',
        'aria-label="Reload"',
        'aria-label="Copy URL"',
        'aria-label="Open externally"',
        "historyIndex",
    ),
    "generic browser tab",
)

for retired_path in (
    Path("web/src/workspace.tsx"),
    Path("web/src/viewer-tabs.tsx"),
):
    if retired_path.exists():
        fail(f"retired Phase-1 shell file must not exist: {retired_path}")

for retired_contract in (
    "ReviewWorkspace",
    "AppTabBar",
    "ActivityBarPosition",
    'ViewMode = "single" | "split"',
):
    for path in (
        Path("web/src/app.tsx"),
        Path("web/src/settings.ts"),
        Path("web/src/workbench/model.ts"),
        Path("web/src/workbench/shell.tsx"),
    ):
        if retired_contract in sources[path]:
            fail(f"retired shell contract {retired_contract!r} remains in {path}")

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
    f"ok: {BOOK}: {len(EXPECTED)} canonical artifacts, single-source manuscript {paper_file}, "
    f"and web workbench validated"
)
