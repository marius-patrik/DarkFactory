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
        "DarkFactory: Agentic Engineering in practice (Agentické inženýrství v praxi)",
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
        "#let section(",
        "#let folder(",
        "#let relation(",
        "#let collect-concepts(folders)",
        "#let build-vocabulary(folders)",
        "#let render-concept-title(item) = {",
        "#let render-inline-example(item, terms, graph)",
        "#let render-concept(item, terms, graph, level: 1, title: none)",
        "#let render-section-body(item, terms, graph)",
        "heading(level: level, numbering: none, outlined: true)",
        "let has-section = node.title != none or node.section != none",
        'assert(edge.type in ("dependency", "related", "parent", "child")',
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
section_files = tuple(
    path for path in all_book_typ if "#let item = section(" in path.read_text(encoding="utf-8")
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
if not section_files:
    fail(f"book contains no structural section records: {BOOK}")
if not folder_manifests:
    fail(f"book contains no structural folder manifests: {BOOK}")

for path in section_files:
    source = path.read_text(encoding="utf-8")
    require_contract(source, ("key:", "title:", "definition:", "description:"), f"section {path}")

references_typ_path = ROOT / "bib/references.typ"
references_bib_path = ROOT / "bib/references.bib"
references_typ = require_file(references_typ_path)
references_bib = require_file(references_bib_path)
reference_handles = re.findall(r'#let\s+([A-Za-z0-9_]+)\s*=\s*<([^>]+)>', references_typ)
bib_keys = set(re.findall(r'@[A-Za-z]+\{([^,]+),', references_bib))
exposed_bib_keys = {key for _, key in reference_handles}
missing_handles = sorted(bib_keys - exposed_bib_keys)
if missing_handles:
    fail("bibliography entries missing references.typ handles: " + ", ".join(missing_handles))

bibliography_usage = "\n".join(
    path.read_text(encoding="utf-8")
    for path in all_book_typ
    if path != references_typ_path
)
unused_handles = sorted(
    handle for handle, _ in reference_handles
    if f"bib.{handle}" not in bibliography_usage
)
if unused_handles:
    fail("unused bibliography handles: " + ", ".join(unused_handles))

concept_keys: list[str] = []
keyword_keys: list[str] = []
for path in concept_files:
    source = path.read_text(encoding="utf-8")
    require_contract(source, ("definition:", "description:", "key:"), f"concept {path}")
    if path.is_relative_to(ROOT / "software-engineering") or path.is_relative_to(ROOT / "language-models") or path.is_relative_to(ROOT / "agentic-engineering"):
        require_contract(source, ("citation:", "source:"), f"theory concept {path}")
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

concept_key_set = set(concept_keys)
for path in concept_files:
    source = path.read_text(encoding="utf-8")
    for target in re.findall(r'target:\s*"([^"]+)"', source):
        if target not in concept_key_set:
            fail(f"concept relation in {path} targets unknown concept: {target}")

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
            "manuscript/practical/darkfactory-architecture/index.typ",
            "manuscript/practical/execution-lifecycle/index.typ",
            "manuscript/results/index.typ",
        ),
        ROOT / "software-engineering/index.typ": (
            "software-engineering.typ",
            "vibe-coding.typ",
            "slop.typ",
            "spec-driven-development.typ",
            "planning.typ",
            "version-control.typ",
            "branch.typ",
            "pull-request.typ",
            "continuous-integration.typ",
            "integration-test.typ",
            "dag.typ",
            "runtime.typ",
            "container.typ",
            'title: [AI-asistovaný vývoj]',
            'title: [Řízení změn]',
            'title: [Ověřování a integrace]',
            'title: [Specifikace a plánování]',
            'title: [Běhová prostředí]',
        ),
        ROOT / "language-models/index.typ": (
            'key: "model"',
            'title: [Model]',
            "language-model/language-model.typ",
            "language-model/context-rot.typ",
            "language-model/divergence.typ",
            'title: [Jazykové modely]',
            'title: [Inferenční kontext]',
            'title: [Limity modelu]',
        ),
        ROOT / "agentic-engineering/agent-harness/index.typ": (
            "agent-harness/agent-harness.typ",
            "agent-harness/session-management.typ",
            "agent-harness/turn.typ",
            "agent-harness/transcript.typ",
            "agent-harness/state.typ",
            "agent-harness/agent-loop.typ",
            "agent-harness/environment.typ",
            "agentic-engineering/sandbox.typ",
            "agent-harness/plugins.typ",
            "agent-harness/tools/tools.typ",
            "agent-harness/tools/mcp.typ",
            "agent-harness/skills/skills.typ",
            'title: [Stav běhu]',
            'title: [Běh a prostředí]',
            'title: [Rozšíření harnessu]',
        ),
        ROOT / "agentic-engineering/index.typ": (
            "agentic-engineering.typ",
            "guardrail.typ",
            "human-in-the-loop.typ",
            "goal-loops.typ",
            "prompt-engineering/index.typ",
            "context-engineering/index.typ",
            "multi-agent-systems/index.typ",
            'title: [Řízení provádění]',
        ),
        ROOT / "agentic-engineering/context-engineering/index.typ": (
            "context-engineering.typ",
            "context-injection.typ",
            "prompt-injection.typ",
            "compaction.typ",
            "rag.typ",
        ),
        ROOT / "agentic-engineering/multi-agent-systems/index.typ": (
            "subagent.typ",
            "orchestrator.typ",
            "handoff.typ",
            "swarm.typ",
            "workflow-graphs.typ",
        ),
        ROOT / "manuscript/practical/darkfactory-architecture/index.typ": (
            "darkfactory.typ",
            "protocol.typ",
            "run-state.typ",
            "routing.typ",
            "supervisor.typ",
            "result-capture.typ",
            "recovery.typ",
            "capability.typ",
            "capability-abi.typ",
            "capability-adapter.typ",
            "github-control-plane.typ",
            "keychain.typ",
            "browser-auth.typ",
            "cli.typ",
            "web.typ",
            "docs-compiler.typ",
            'title: [Cíle návrhu]',
            'title: [Celková architektura]',
            'title: [Vykonávací jádro a stav]',
            'title: [Systém capabilities]',
            'title: [Externí integrace]',
            'title: [Identita a bezpečnostní hranice]',
            'title: [Rozhraní]',
        ),
        ROOT / "manuscript/practical/execution-lifecycle/index.typ": (
            "request.typ",
            "planning-artifact.typ",
            "review-fix-loop.typ",
            "deterministic-verification.typ",
            "final-alignment.typ",
            "reconciliation.typ",
            'title: [Zachycení požadavku]',
            'title: [Plánování a schválení]',
            'title: [Implementace]',
            'title: [Ověření a revize]',
            'title: [Finalizace a integrace]',
            'title: [Obnova a pokračování]',
        ),
        ROOT / "manuscript/appendices/index.typ": (
            "manuscript/appendices/encyclopedia/index.typ",
        ),
        ROOT / "manuscript/appendices/encyclopedia/index.typ": (
            "encyclopedia.typ",
            "Encyklopedie a rejstřík pojmů",
        ),
        ROOT / "manuscript/results/index.typ": (
            'title: [Metoda ověření]',
            'title: [Technické výsledky]',
            'title: [End-to-end ověření]',
            'title: [Ověření na cílových repozitářích]',
            'title: [Vyhodnocení cílů a výzkumných otázek]',
            'title: [Omezení]',
            'title: [Diskuse]',
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
        ROOT / "manuscript/practical/darkfactory-architecture/index.typ",
        ROOT / "manuscript/practical/execution-lifecycle/index.typ",
        ROOT / "manuscript/results/index.typ",
        ROOT / "manuscript/conclusion/index.typ",
        ROOT / "manuscript/appendices/index.typ",
        ROOT / "manuscript/appendices/encyclopedia/index.typ",
        ROOT / "manuscript/appendices/encyclopedia/encyclopedia.typ",
        ROOT / "software-engineering/branch.typ",
        ROOT / "software-engineering/pull-request.typ",
        ROOT / "software-engineering/dag.typ",
        ROOT / "language-models/language-model/divergence.typ",
        ROOT / "agentic-engineering/agent-harness/state.typ",
        ROOT / "agentic-engineering/agent-harness/environment.typ",
        ROOT / "agentic-engineering/agent-harness/tools/tools.typ",
        ROOT / "agentic-engineering/agent-harness/skills/skills.typ",
        ROOT / "agentic-engineering/agent-harness/scripts/scripts.typ",
        ROOT / "agentic-engineering/agent-harness/hooks/hooks.typ",
        ROOT / "agentic-engineering/agent-harness/transcript.typ",
        ROOT / "agentic-engineering/context-engineering/prompt-injection.typ",
        ROOT / "agentic-engineering/goal-loops.typ",
        ROOT / "agentic-engineering/multi-agent-systems/index.typ",
        ROOT / "agentic-engineering/multi-agent-systems/orchestrator.typ",
        ROOT / "agentic-engineering/multi-agent-systems/handoff.typ",
        ROOT / "agentic-engineering/multi-agent-systems/swarm.typ",
        ROOT / "agentic-engineering/multi-agent-systems/workflow-graphs.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/darkfactory.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/protocol.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/run-state.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/routing.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/supervisor.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/result-capture.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/recovery.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/capability.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/capability-abi.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/capability-adapter.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/github-control-plane.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/keychain.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/browser-auth.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/cli.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/web.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/docs-compiler.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/design-goals.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/overview.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/execution-engine.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/capabilities.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/integrations.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/identity-security.typ",
        ROOT / "manuscript/practical/darkfactory-architecture/interfaces.typ",
        ROOT / "manuscript/practical/execution-lifecycle/request.typ",
        ROOT / "manuscript/practical/execution-lifecycle/planning-artifact.typ",
        ROOT / "manuscript/practical/execution-lifecycle/review-fix-loop.typ",
        ROOT / "manuscript/practical/execution-lifecycle/deterministic-verification.typ",
        ROOT / "manuscript/practical/execution-lifecycle/final-alignment.typ",
        ROOT / "manuscript/practical/execution-lifecycle/reconciliation.typ",
        ROOT / "manuscript/practical/execution-lifecycle/request-capture-section.typ",
        ROOT / "manuscript/practical/execution-lifecycle/planning-section.typ",
        ROOT / "manuscript/practical/execution-lifecycle/implementation-section.typ",
        ROOT / "manuscript/practical/execution-lifecycle/verification-section.typ",
        ROOT / "manuscript/practical/execution-lifecycle/finalization-section.typ",
        ROOT / "manuscript/practical/execution-lifecycle/recovery-section.typ",
        ROOT / "manuscript/results/evaluation-method.typ",
        ROOT / "manuscript/results/technical-results.typ",
        ROOT / "manuscript/results/end-to-end-evaluation.typ",
        ROOT / "manuscript/results/target-repository-evaluation.typ",
        ROOT / "manuscript/results/goal-question-section.typ",
        ROOT / "manuscript/results/research-question-evaluation.typ",
        ROOT / "manuscript/results/evaluation-limitations.typ",
        ROOT / "manuscript/results/discussion.typ",
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
    f"{len(section_files)} sections, {len(concept_files)} concepts, final hierarchy and web workbench validated"
)
