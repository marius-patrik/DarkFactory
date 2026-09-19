#!/usr/bin/env python3
"""Sanity checks for the generated Typst publication matrix."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

EXPECTED_PDFS = (
    Path("out/prace.pdf"),
    Path("out/prace-cs.pdf"),
    Path("out/prace-en.pdf"),
    Path("out/prace-bilingual.pdf"),
    Path("out/prace-review.pdf"),
    Path("out/prace-cs-review.pdf"),
    Path("out/prace-en-review.pdf"),
    Path("out/prace-bilingual-review.pdf"),
)
EXPECTED_HTML = tuple(path.with_suffix(".html") for path in EXPECTED_PDFS)
EXPECTED_MARKDOWN = tuple(path.with_suffix(".md") for path in EXPECTED_PDFS)
EXPECTED = EXPECTED_PDFS + EXPECTED_HTML + EXPECTED_MARKDOWN


def fail(message: str) -> None:
    raise SystemExit(f"build check failed: {message}")


for path in EXPECTED:
    if not path.is_file():
        fail(f"missing {path}")
    if path.stat().st_size < 256:
        fail(f"{path} is unexpectedly small ({path.stat().st_size} bytes)")

for path in EXPECTED_PDFS:
    if path.stat().st_size < 1024:
        fail(f"{path} is unexpectedly small ({path.stat().st_size} bytes)")
    with path.open("rb") as handle:
        if handle.read(5) != b"%PDF-":
            fail(f"{path} is not a PDF")

for path in EXPECTED_HTML:
    source = path.read_text(encoding="utf-8").lower()
    if "<html" not in source or "<body" not in source:
        fail(f"{path} is not a complete compiled HTML publication")

for path in EXPECTED_MARKDOWN:
    source = path.read_text(encoding="utf-8")
    if "#" not in source or len(source.strip()) < 256:
        fail(f"{path} is not a substantive compiled Markdown publication")


TEMPLATE_NAMES = tuple(
    sorted(
        path.parent.name
        for path in Path("templates").glob("*/template.typ")
    )
)
if not TEMPLATE_NAMES:
    fail("no document templates discovered")

TEMPLATE_FILENAMES = tuple(path.name for path in EXPECTED)
for template_name in TEMPLATE_NAMES:
    template_out = Path("out/templates") / template_name
    matrix = tuple(template_out / name for name in TEMPLATE_FILENAMES)
    for path in matrix:
        if not path.is_file():
            fail(f"missing template matrix artifact: {path}")
        if path.stat().st_size < 256:
            fail(f"{path} is unexpectedly small ({path.stat().st_size} bytes)")
        if path.suffix == ".pdf":
            with path.open("rb") as handle:
                if handle.read(5) != b"%PDF-":
                    fail(f"{path} is not a PDF")
        elif path.suffix == ".html":
            source = path.read_text(encoding="utf-8").lower()
            if "<html" not in source or "<body" not in source:
                fail(f"{path} is not a complete HTML publication")
        elif path.suffix == ".md":
            source = path.read_text(encoding="utf-8")
            if "#" not in source:
                fail(f"{path} is not a Markdown publication")

    for final_stem, review_stem in (
        ("prace", "prace-review"),
        ("prace-cs", "prace-cs-review"),
        ("prace-en", "prace-en-review"),
        ("prace-bilingual", "prace-bilingual-review"),
    ):
        for extension in (".pdf", ".html", ".md"):
            final = template_out / f"{final_stem}{extension}"
            review = template_out / f"{review_stem}{extension}"
            if final.read_bytes() == review.read_bytes():
                fail(
                    "template review output is byte-identical to final output: "
                    f"{template_name}/{final.name}"
                )

# Repository architecture invariants.
gitmodules = Path(".gitmodules")
if not gitmodules.is_file():
    fail("missing .gitmodules")
gitmodules_text = gitmodules.read_text(encoding="utf-8")
if gitmodules_text.count("[submodule ") != 1:
    fail("exactly one git submodule is allowed")
if '[submodule "darkfactory"]' not in gitmodules_text:
    fail("the sole submodule must be darkfactory")
if "marius-patrik/DarkFactory.git" not in gitmodules_text:
    fail("darkfactory submodule must point to marius-patrik/DarkFactory")

template_root = Path("templates/gjkt-odborna-prace")
for required in (
    Path("templates/common.typ"),
    Path("templates/registry.typ"),
    Path("templates/terms.typ"),
    template_root / "template.typ",
    template_root / "wordometer.typ",
    template_root / "README.md",
):
    if not required.is_file():
        fail(f"missing document-template file: {required}")

if Path("packages").exists():
    fail("legacy packages/ directory must not reappear")
if (template_root / "typst.toml").exists():
    fail("document templates are implementations, not nested Typst packages")

registry = Path("templates/registry.typ").read_text(encoding="utf-8")
if '"gjkt-odborna-prace"' not in registry:
    fail("GJKT template is not registered")
if '#import "common.typ" as common' not in registry:
    fail("template registry must import the shared manuscript API")
for semantic in ("accepted", "finalized", "unconfirmed", "diff", "term", "bilingual"):
    expected = f"#let {semantic} = common.{semantic}"
    if expected not in registry:
        fail(f"registry semantic helper is not routed through common.typ: {semantic}")

common_source = Path("templates/common.typ").read_text(encoding="utf-8")
for renderer in ("render-keywords", "render-index"):
    if f"#let {renderer}" not in common_source:
        fail(f"missing shared terminology renderer: {renderer}")

for required in (
    "#let collect-canonical-terms",
    "#let index-sort-name",
    "#let index-letter",
    "heading(\n          level: 2",
    "#heading(\n          level: 3",
    'label("kw-" + item.id)',
):
    if required not in common_source:
        fail(f"Index missing alphabetical internal hierarchy contract: {required}")
if ".slice(0, 1)" in common_source:
    fail("Index grouping must use grapheme-safe first() rather than byte-index slicing")
if "index-sort-name(item).first()" not in common_source:
    fail("Index grouping must derive its letter with grapheme-safe first()")
if "#let render-index(values)" not in common_source:
    fail("Index must accept the complete canonical vocabulary")
if "collect-canonical-terms(values)" not in common_source:
    fail("Index must deduplicate the complete canonical vocabulary by stable term id")
if '] #label("kw-" + item.id)' not in common_source:
    fail("Index keyword labels must attach to headings in markup mode")

for required in (
    "outlined: false",
    "link(\n        label(\"kw-\" + item.id)",
    ").join([#linebreak()])",
):
    if required not in common_source:
        fail(f"Index must keep the full term list local while hiding term children from the main contents: {required}")
if "outlined: true" in common_source[common_source.find("#let render-index(values)") :]:
    fail("Rejstřík child headings must not expand the main Obsah")

for required in (
    "#let term-proper-name",
    "#let term-industry-name",
    'text("[")',
    'text("]")',
    'text("(")',
    'text(")")',
    "Czech [English] (Industry)",
):
    if required not in common_source:
        fail(f"canonical term-name renderer missing global naming contract: {required}")

chapter1_source = Path("kapitoly/01-uvod.typ").read_text(encoding="utf-8")
finalized_main_goal = (
    "=== #finalized[Hlavní cíl]\n\n"
    "#finalized[\n"
    "Vymezit teoretické principy agentického inženýrství (_agentic engineering_) "
    "a navrhnout modulární architekturu řídicího harnessu pro automatizovaný vývoj "
    "softwaru se zachováním lidského dohledu v klíčových rozhodovacích bodech.\n]"
)
if finalized_main_goal not in chapter1_source:
    fail("main thesis goal must remain finalized exactly as approved")

for required_heading in (
    "=== #finalized[Hlavní cíl]",
    "=== #accepted[Dílčí cíle]",
    "=== Výzkumné otázky",
):
    if required_heading not in chapter1_source:
        fail(f"chapter 1 pseudo-section must remain a real numbered heading: {required_heading}")

finalized_agent_harness = (
    "#finalized[\n"
    "Ústřední inženýrská otázka této práce proto nespočívá v tom, zda jazykový model "
    "dokáže napsat fragment kódu. Zkoumáme, jaká kontrolní a dozorčí architektura — "
    "značovaná jako *agent harness* — musí model obklopovat, aby bylo možné jeho "
    "výstupům v produkčním repozitáři spolehlivě důvěřovat a dosáhnout vysoké míry "
    "autonomie se zachováním lidského dohledu.\n]"
)
if finalized_agent_harness not in chapter1_source:
    fail("agent harness definition sentence must remain finalized with the approved wording")
if "označovaná jako *řídicí harness*" in chapter1_source:
    fail("legacy řídicí harness wording must not return")

chapter2_source = Path("kapitoly/02-teoreticka-cast.typ").read_text(encoding="utf-8")
if "= #finalized[Teoretická část: Vymezení konceptu]" not in chapter2_source:
    fail("theoretical chapter title must remain finalized as Teoretická část: Vymezení konceptu")
if "=== #finalized[Tokeny, tokenizace a Vektorová reprezentace \\[Embedding\\]]" not in chapter2_source:
    fail("tokenization/vector representation section title must remain finalized")
if "=== #diff[#finalized[Tokeny, tokenizace a embedding]" in chapter2_source:
    fail("legacy token section title diff must not return")
finalized_scaling_title = (
    "=== #finalized[Škálování: Multiagentní systémy (Subagenti) a grafy "
    "(DAG workflows) \\[Scaling: Multiagent Systems (Subagents) and DAG "
    "Workflows (Graphs)\\]]"
)
if finalized_scaling_title not in chapter2_source:
    fail("scaling section must retain the finalized bilingual title")
if "=== Škálování: hierarchičtí subagenti a DAG workflow" in chapter2_source:
    fail("legacy section 2.3.8 title must not return")

finalized_version_control_title = (
    "== #finalized[Správa verzí \\[Version Control\\], Plánování \\[Planning\\], "
    "Kontinuální integrace \\[Continuous Integration\\] (CI a GitHub Actions) "
    "a Požadované kontroly \\[Required Checks\\]]"
)
if finalized_version_control_title not in chapter2_source:
    fail("section 2.1 must retain the finalized expanded engineering title")
if "=== #finalized[Pull Request]" not in chapter2_source:
    fail("section 2.1.3 title must remain finalized as Pull Request")
if "=== Model #term(terms.pull_request" in chapter2_source:
    fail("legacy section 2.1.3 title must not return")

if "=== #finalized[Větve (Branches)]" not in chapter2_source:
    fail("section 2.1.2 must remain finalized as Větve (Branches)")
if "Větve (Branches) a izolace kódu" in chapter2_source:
    fail("legacy section 2.1.2 title must not return")
for required_heading in (
    "=== Spouštění nástrojů [Tool Calling]",
    "=== Sandbox",
):
    if required_heading not in chapter2_source:
        fail(f"tool runtime split missing numbered section: {required_heading}")
if "=== Běhové prostředí nástrojů a pískoviště (Sandbox)" in chapter2_source:
    fail("combined tool-runtime/sandbox section must not return")
accepted_react_caption = (
    "caption: [#accepted[Architektura autonomní ReAct smyčky (Reasoning + Acting) "
    "a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.]]"
)
if accepted_react_caption not in chapter2_source:
    fail("ReAct figure caption must retain accepted state")

gjkt_source = (template_root / "template.typ").read_text(encoding="utf-8")
for terminology_contract in (
    "translation(cs: [Klíčová slova], en: [Keywords])",
    "render-keywords()",
    "render-index(vocabulary.values())",
    '#import "../terms.typ": vocabulary',
    'ui-label([Rejstřík], [Index])',
    'ui-label([Seznam příloh], [List of appendices])',
    '<body-end-anchor>',
):
    if terminology_contract not in gjkt_source:
        fail(f"GJKT template missing terminology/back-matter contract: {terminology_contract}")

index_pos = gjkt_source.find('ui-label([Rejstřík], [Index])')
appendix_list_pos = gjkt_source.find('ui-label([Seznam příloh], [List of appendices])', index_pos)
if index_pos < 0 or appendix_list_pos < 0 or index_pos >= appendix_list_pos:
    fail("Index must be emitted immediately before the list of appendices in back matter")

front_matter_start = gjkt_source.find("#let anotace-strana")
front_matter_end = gjkt_source.find("#let template(", front_matter_start)
if "render-index(vocabulary.values())" in gjkt_source[front_matter_start:front_matter_end]:
    fail("Index must not remain in front matter")

if '.before(<body-end-anchor>, inclusive: false)' not in gjkt_source:
    fail("core-text extent must stop before back-matter Index and appendices")

for forbidden in ('state("review-mode"', 'state("publication-profile"'):
    if forbidden in gjkt_source:
        fail("concrete templates must not own shared review/profile state")
if '#import "../common.typ"' not in gjkt_source:
    fail("GJKT template must consume the shared manuscript API")

if "outline(title: ui-label([Obsah], [Contents]), depth: 6, indent: auto)" not in gjkt_source:
    fail("document contents must expose nested numbered sections through depth 6")
if "heading.where(level: 1, supplement: [Příloha])" not in gjkt_source:
    fail("Seznam příloh must contain top-level appendices only")
for level in (4, 5, 6):
    if f"show heading.where(level: {level})" not in gjkt_source:
        fail(f"nested numbered heading level {level} must retain explicit document styling")

def active_typst_imports(source: str) -> list[str]:
    imports: list[str] = []
    in_fence = False
    for line in source.splitlines():
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if not in_fence and line.lstrip().startswith("#import "):
            imports.append(stripped)
    return imports

for path in (
    Path("metadata.typ"),
    Path("thesis.typ"),
    *sorted(Path("kapitoly").glob("*.typ")),
):
    source = path.read_text(encoding="utf-8")
    imports = active_typst_imports(source)
    if any("packages/odborna-prace-template" in line for line in imports):
        fail(f"legacy package import remains in {path}")
    if path.name != "thesis.typ" and any("templates/gjkt-odborna-prace" in line for line in imports):
        fail(f"manuscript bypasses template registry in {path}")

# Chapter files contain semantic content only. Structural page/layout directives
# belong to the selected document template so the same manuscript can be rendered
# by another template without editing chapter sources.
for path in sorted(Path("kapitoly").glob("*.typ")):
    in_fence = False
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        stripped = line.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        forbidden = (
            "#pagebreak",
            "#set page",
            "#set text",
            "#set par",
            "#set heading",
            "#show heading",
            "#align(",
            "#pad(",
        )
        if any(token in stripped for token in forbidden):
            fail(f"layout directive belongs in template, not {path}:{line_number}: {stripped}")

# Shared terminology must remain declarative and centralized.
registry_source = Path("templates/registry.typ").read_text(encoding="utf-8")
if '#import "terms.typ": vocabulary' not in registry_source or "#let terms = vocabulary" not in registry_source:
    fail("template registry must export the shared terminology vocabulary")

metadata_source = Path("metadata.typ").read_text(encoding="utf-8")
finalized_annotation_opening = (
    "#finalized[\n"
    "        Tato odborná práce se zabývá principy agentického inženýrství (_agentic engineering_):\n"
    "        efektivními inženýrskými praktikami pro vývoj pomocí umělé inteligence prostřednictvím\n"
    "        agentických systémů a architekturou těchto systémů.\n"
    "      ]"
)
if finalized_annotation_opening not in metadata_source:
    fail("Czech annotation opening must remain finalized with the approved agentic-engineering definition")
if "a architekturou řídicích harnessů pro automatizovaný vývoj softwaru" in metadata_source:
    fail("legacy Czech annotation opening must not return")

terms_source = Path("templates/terms.typ").read_text(encoding="utf-8")
if 'proper: translation(cs: "Agentické inženýrství", en: "Agentic Engineering")' not in terms_source:
    fail("Agentic Engineering Czech canonical term must be Agentické inženýrství")
if 'proper: translation(cs: "Agentní inženýrství", en: "Agentic Engineering")' in terms_source:
    fail("legacy Agentní inženýrství canonical term must not return")
if 'proper: translation(cs: "Rozšíření", en: "Plugins")' not in terms_source:
    fail("Plugins Czech proper term must remain Rozšíření")
if "Zásuvné moduly" in terms_source:
    fail("legacy Czech Plugins term Zásuvné moduly must not return")
if "proper: translation(" not in terms_source:
    fail("canonical terminology must use proper/formal name records")
if "define-term(\n    id:" in terms_source and "proper:" not in terms_source:
    fail("legacy flat term schema detected")

term_ids = re.findall(r'id:\s*"([^"]+)"', terms_source)
duplicate_term_ids = sorted({term_id for term_id in term_ids if term_ids.count(term_id) > 1})
if duplicate_term_ids:
    fail(f"canonical terminology contains duplicate stable ids: {duplicate_term_ids}")

required_term_ids = {
    "mcp",
    "skills",
    "script",
    "plugins",
    "hook",
    "chatbot",
    "agent",
    "token",
    "tokenizer",
    "language-model",
    "transformer",
    "context-window",
    "context-compaction",
    "context-rot",
    "human-in-the-loop",
    "agentic-engineering",
    "software-engineering",
    "pull-request",
    "continuous-integration",
    "github-actions",
    "dag",
    "container",
    "kv-cache",
    "turn",
    "context-engineering",
    "prompt-engineering",
    "loop-engineering",
    "graph-engineering",
    "rag",
    "merge",
    "squash",
    "branch",
}
missing_term_ids = sorted(required_term_ids - set(term_ids))
if missing_term_ids:
    fail(f"canonical terminology missing required concepts: {missing_term_ids}")

required_term_keys = (
    "mcp",
    "skills",
    "script",
    "plugins",
    "hook",
    "chatbot",
    "agent",
    "token",
    "tokenizer",
    "language_model",
    "transformer",
    "context_window",
    "compaction",
    "context_rot",
    "human_in_the_loop",
    "agentic_engineering",
    "software_engineering",
    "pull_request",
    "continuous_integration",
    "github_actions",
    "dag",
    "container",
    "kv_cache",
    "turn",
    "context_engineering",
    "prompt_engineering",
    "loop_engineering",
    "graph_engineering",
    "rag",
    "merge",
    "squash",
    "branch",
)
for term_key in required_term_keys:
    if f"\n  {term_key}:" not in terms_source:
        fail(f"canonical terminology missing public vocabulary key: {term_key}")

for path in sorted(Path("kapitoly").glob("*.typ")):
    source = path.read_text(encoding="utf-8")
    if '#term("' in source or "explanation:" in source:
        fail(f"chapter contains an ad-hoc term definition instead of terms.<id>: {path}")
    if "#accepted[#diff" in source or "#finalized[#diff" in source:
        fail(f"accepted/finalized content must not retain a diff: {path}")

# Legacy review marker API must not return.
for path in (
    Path("templates/common.typ"),
    Path("templates/registry.typ"),
    Path("templates/gjkt-odborna-prace/template.typ"),
    Path("metadata.typ"),
    Path("AGENTS.md"),
    *sorted(Path("kapitoly").glob("*.typ")),
):
    source = path.read_text(encoding="utf-8")
    for legacy in ("#confirmed[", "#let confirmed", "common.confirmed"):
        if legacy in source:
            fail(f"legacy confirmed review state remains in {path}: {legacy}")

viewer_required = (
    Path("web/package.json"),
    Path("web/components.json"),
    Path("web/vite.config.ts"),
    Path("web/index.html"),
    Path("web/viewer.html"),
    Path("web/src/main.tsx"),
    Path("web/src/app.tsx"),
    Path("web/src/compiled-artifact.tsx"),
    Path("web/src/pdf-document.tsx"),
    Path("web/src/viewer.css"),
    Path("web/src/components/animated-icon.tsx"),
    Path("web/src/components/ui/button.tsx"),
    Path("web/src/components/ui/tooltip.tsx"),
    Path("web/src/components/ui/dropdown-menu.tsx"),
    Path("web/src/components/ui/context-menu.tsx"),
)
for path in viewer_required:
    if not path.is_file() or path.stat().st_size == 0:
        fail(f"missing React viewer source: {path}")

for legacy in (
    Path("web/viewer.js"),
    Path("web/viewer.css"),
    Path("web/icons.js"),
):
    if legacy.exists():
        fail(f"legacy static viewer asset must not remain: {legacy}")

package = json.loads(Path("web/package.json").read_text(encoding="utf-8"))
dependencies = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
for dependency in (
    "react",
    "react-dom",
    "typescript",
    "vite",
    "motion",
    "@dagrejs/dagre",
    "lucide-animated",
    "lucide-react",
    "pdfjs-dist",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-context-menu",
    "@radix-ui/react-dropdown-menu",
    "tailwindcss",
):
    if dependency not in dependencies:
        fail(f"React viewer missing required dependency: {dependency}")

app_source = Path("web/src/app.tsx").read_text(encoding="utf-8")
for required in (
    "TooltipAction",
    "Columns2Icon",
    "MinusIcon",
    "PlusIcon",
    "RefreshCwIcon",
    "PanelLeftIcon",
    "PanelRightIcon",
    "ModePicker",
    "FormatPicker",
    "CompiledArtifactView",
    "ArtifactFormat",
    "MaximizeIcon",
    "ContextMenu",
    "status-actions",
    "identity-separator",
    "motion.section",
):
    if required not in app_source:
        fail(f"React viewer missing UI contract: {required}")
if app_source.count('className="identity-separator"') < 5:
    fail("toolbar path must include language, mode, format, chapter, and page segments")
for required in ('format={format}', 'pdfHref={pdfTarget}', 'markdownHref={markdownTarget}', 'htmlHref={htmlTarget}'):
    if required not in app_source:
        fail(f"compiled-format path selector missing contract: {required}")

for required in ('className="path-page-switcher"', 'className="path-page-control"', 'label="Previous page"', 'label="Next page"'):
    if required not in app_source:
        fail(f"page switcher must live at the tail of the path navigation: {required}")

for required in (
    "ChapterPicker",
    'className="chapter-select"',
    'names={["BookOpenIcon"]}',
    "state.chapters",
    "LanguagesIcon",
    "FileTextIcon",
    "FileCode2Icon",
    "Code2Icon",
    "PencilLineIcon",
    'viewMode === "split" ? "Review" : mode === "review" ? "Koncept" : "Final"',
):
    if required not in app_source:
        fail(f"viewer path controls missing icon/chapter/mode contract: {required}")
if 'label="Home"' in app_source:
    fail("viewer toolbar must not restore the Home button")
if 'className="page-control"' in app_source:
    fail("legacy bottom-status page switcher must not return")
if "peerTarget" in app_source:
    fail("Final/Koncept/Review switching must live in the path bar, not a legacy peer control")

compiled_artifact_source = Path("web/src/compiled-artifact.tsx").read_text(encoding="utf-8")
for required in (
    'fetch(path, { cache: "no-store" })',
    'src={path}',
    'format === "html"',
    'Loading compiled Markdown',
    'data-theme',
    'theme: "dark" | "light"',
):
    if required not in compiled_artifact_source:
        fail(f"compiled artifact viewer must render generated files directly: {required}")

icon_source = Path("web/src/components/animated-icon.tsx").read_text(encoding="utf-8")
for required in ("lucide-animated", "lucide-react", "STATIC_FALLBACKS"):
    if required not in icon_source:
        fail(f"viewer icon adapter missing fallback contract: {required}")
for required in (
    "MinusIcon: Minus",
    "RefreshCwIcon: RefreshCw",
    "LanguagesIcon: Languages",
    "FileTextIcon: FileText",
    "FileCode2Icon: FileCode2",
    "Code2Icon: Code2",
    "PencilLineIcon: PencilLine",
    "Columns2Icon: Columns2",
    "BookOpenIcon: BookOpen",
):
    if required not in icon_source:
        fail(f"viewer icon adapter missing guaranteed static fallback: {required}")
if 'label="Refresh page"' not in app_source or "window.location.reload()" not in app_source:
    fail("viewer must expose an in-UI refresh page action")

template_source = Path("templates/gjkt-odborna-prace/template.typ").read_text(encoding="utf-8")
if '"KONCEPT"' in template_source:
    fail("review template must not add the KONCEPT page-background watermark")

thesis_source = Path("thesis.typ").read_text(encoding="utf-8")
if '"KONCEPT"' in thesis_source:
    fail("thesis composition must not force the KONCEPT review watermark")
if 'splitHref={canSplit ? splitTarget : "#"}' not in app_source:
    fail("Final/Koncept/Review path selector must expose the comparison view")

pdf_source = Path("web/src/pdf-document.tsx").read_text(encoding="utf-8")
for required in (
    "dagre.layout",
    "TextLayer",
    "AnnotationLayer",
    "ContextMenu",
    "Minimap",
    "class AnnotationLinkService",
    "goToDestination",
    "getDestinationHash",
    "addLinkAttributes",
    "getPageIndex",
    "installAnnotationInteractions",
    'closest<HTMLElement>("[data-element-id]")',
    "stopImmediatePropagation",
    "window.open(annotation.url",
    "loadTopLevelChapters",
    "pdf.getOutline",
    "chapters: DocumentChapter[]",
):
    if required not in pdf_source:
        fail(f"React PDF viewer missing interaction contract: {required}")
if "PDFLinkService" in pdf_source or "setViewer({" in pdf_source:
    fail("custom PDF renderer must not depend on a partial PDFViewer/PDFLinkService surrogate")

main_source = Path("web/src/main.tsx").read_text(encoding="utf-8")
if "<ViewerApp />" not in main_source or "PublicationIndex" in main_source:
    fail("site root must open directly into the viewer")
for required in (
    'const profileName = params.get("profile") || "school"',
    'const mode: ViewerMode = params.get("mode") === "review" ? "review" : "final"',
    'requestedFormat === "markdown" ? "markdown" : requestedFormat === "html" ? "html" : "pdf"',
    'Loading school Final PDF…',
):
    if required not in app_source:
        fail(f"viewer root missing school/final/PDF default contract: {required}")

vite_source = Path("web/vite.config.ts").read_text(encoding="utf-8")
for required in ("@vitejs/plugin-react", "@tailwindcss/vite", "viewer.html", "index.html"):
    if required not in vite_source:
        fail(f"Vite config missing multi-page React contract: {required}")

web_publication = Path("web-publication.typ")
web_exporter = Path("scripts/build_web_exports.py")
for required_path in (web_publication, web_exporter):
    if not required_path.is_file() or required_path.stat().st_size == 0:
        fail(f"missing compiled web publication source/tool: {required_path}")

web_export_source = web_exporter.read_text(encoding="utf-8")
for required in (
    '"--features", "html"',
    '"--format", "html"',
    "html_to_markdown",
    'parser.add_argument("--source", default="web-publication.typ")',
    'output.with_suffix(".md")',
    'darkfactory-publication-style',
    'style_compiled_html',
    'nav[role="doc-toc"]',
):
    if required not in web_export_source:
        fail(f"web exporter missing compiled HTML/Markdown contract: {required}")

web_publication_source = web_publication.read_text(encoding="utf-8")
for required in (
    "#outline(title: ui-label([Obsah], [Contents]), depth: 6)",
    "heading.where(level: 1, supplement: [Příloha])",
):
    if required not in web_publication_source:
        fail(f"semantic web publication missing section/appendix hierarchy contract: {required}")

makefile_source = Path("Makefile").read_text(encoding="utf-8")
for required in (
    "exports:",
    "scripts/build_web_exports.py",
    "all: build review exports",
):
    if required not in makefile_source:
        fail(f"Makefile missing semantic publication build contract: {required}")

site_builder = Path("scripts/build_site.py").read_text(encoding="utf-8")
for required in (
    'WEB_DIST = Path("web/dist")',
    "shutil.copytree(WEB_DIST, SITE)",
    "compiled Typst HTML/Markdown",
    '"formats": ["pdf", "markdown", "html"]',
    'variant["artifacts"][mode].items()',
    '"shadcn/ui"',
    '"Motion"',
    '"Dagre"',
):
    if required not in site_builder:
        fail(f"Pages builder missing multi-format publication contract: {required}")

manifest_path = Path(".github/darkfactory.json")
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
release_assets = {Path(value) for value in manifest.get("release", {}).get("assets", [])}
expected_assets = set(EXPECTED)
if release_assets != expected_assets:
    missing = sorted(str(p) for p in expected_assets - release_assets)
    extra = sorted(str(p) for p in release_assets - expected_assets)
    fail(f"release asset matrix mismatch; missing={missing}, extra={extra}")

pairs = (
    ("prace", "prace-review"),
    ("prace-cs", "prace-cs-review"),
    ("prace-en", "prace-en-review"),
    ("prace-bilingual", "prace-bilingual-review"),
)
for final_stem, review_stem in pairs:
    for extension in (".pdf", ".html", ".md"):
        final = Path("out") / f"{final_stem}{extension}"
        review = Path("out") / f"{review_stem}{extension}"
        if final.read_bytes() == review.read_bytes():
            fail(f"review output is byte-identical to final output: {final}")

print(
    f"ok: validated {len(EXPECTED)} canonical publication artifacts "
    f"(PDF/HTML/Markdown) + {len(TEMPLATE_NAMES)} complete template matrices, "
    "architecture, and release manifest"
)
