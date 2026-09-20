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
if "#let render-keywords()" not in common_source:
    fail("missing shared keyword renderer")
keyword_renderer = common_source[common_source.find("#let render-keywords()") :]
if "finalized[" not in keyword_renderer:
    fail("generated keyword list must be wrapped in finalized state")
for forbidden in (
    "#let render-index",
    "#let collect-canonical-terms",
    "#let index-sort-name",
    "#let index-letter",
    'label("kw-" + item.id)',
    "★",
):
    if forbidden in common_source:
        fail(f"standalone terminology index machinery must not return: {forbidden}")

for required in (
    "#let term-name(value)",
    "#let term-sort-name(value)",
    "Industry (Czech) [English]",
    'text("[")',
    'text("]")',
    'text("(")',
    'text(")")',
    "marker: true,",
    "super[#text(fill:",
    '#text("*")',
):
    if required not in common_source:
        fail(f"canonical term-name renderer missing global naming contract: {required}")

for forbidden in (
    "default-name-type:",
    "keyword-name-type:",
    "name-language:",
    "name-type:",
    "name-separator:",
    "name-type-separator:",
    "name-order:",
):
    if forbidden in common_source:
        fail(f"alternate term-name rendering option must not return: {forbidden}")

if Path("kapitoly").exists():
    fail("legacy kapitoly/ compatibility layer must not return; concepts/ is the sole manuscript source")

appendix_root = Path("concepts/manuscript/appendices")
appendix_source = "\n".join(
    path.read_text(encoding="utf-8") for path in sorted(appendix_root.rglob("*.typ"))
)
for stale_appendix in (
    "Obsah přiloženého média",
    "Schéma konfiguračního manifestu darkfactory.json",
    "Sdílené workflow pro GitHub Actions",
    "Systémové prompty plánovacího a kódovacího agenta",
    "Protokol revizních značek v sazebním systému Typst",
    "mono-OdbornaPrace/",
):
    if stale_appendix in appendix_source:
        fail(f"stale appendix content must not return: {stale_appendix}")

main_goal_source = Path("concepts/manuscript/introduction/objectives/main-goal/main-goal.typ").read_text(encoding="utf-8")
for required in (
    'key: "main_goal"',
    'proper: translation(cs: "Hlavní cíl", en: "Main Goal")',
    "definition: terms => [",
    "Vymezit teoretické principy agentického inženýrství (_agentic engineering_)",
    "softwaru se zachováním lidského dohledu v klíčových rozhodovacích bodech.",
):
    if required not in main_goal_source:
        fail(f"main goal concept missing approved contract: {required}")

motivation_source = Path("concepts/manuscript/introduction/motivation/motivation.typ").read_text(encoding="utf-8")
for removed_motivation in (
    "Doporučení k motivaci",
    "fyzickou temnou továrnou",
    "montážní linka",
    "Vizuální metafora výrazně zlepší srozumitelnost pro komisi",
):
    if removed_motivation in motivation_source:
        fail(f"removed motivation-diagram recommendation must not return: {removed_motivation}")
for required in (
    "Ústřední inženýrská otázka této práce proto nespočívá",
    "#term(terms.harness, register: true, linked: true, marker: false)",
):
    if required not in motivation_source:
        fail(f"motivation concept missing approved finalized framing: {required}")

for manuscript_path in (
    *sorted(Path("concepts/manuscript").rglob("*.typ")),
    *sorted(Path("concepts").rglob("*.typ")),
):
    manuscript_source = manuscript_path.read_text(encoding="utf-8")
    for legacy_harness in ("řídicí harness", "řídicího harnessu", "řídicím harnessu"):
        if legacy_harness in manuscript_source:
            fail(f"legacy Czech harness wording remains in {manuscript_path}: {legacy_harness}")

concept_root = Path("concepts")
concept_schema = concept_root / "schema.typ"
concept_catalog = concept_root / "index.typ"
section_dirs = (
    concept_root / "development-environment",
    concept_root / "language-models",
    concept_root / "agentic-engineering",
    concept_root / "manuscript" / "introduction",
    concept_root / "manuscript" / "results",
    concept_root / "manuscript" / "conclusion",
    concept_root / "manuscript" / "appendices",
)
for required in (concept_schema, concept_catalog, *(section / "index.typ" for section in section_dirs)):
    if not required.is_file() or required.stat().st_size == 0:
        fail(f"missing concept-driven manuscript file: {required}")

schema_source = concept_schema.read_text(encoding="utf-8")
for required in (
    "#let concept(",
    "#let folder(",
    "#let collect-concepts(folders)",
    "#let build-vocabulary(folders)",
    "#let render-document-chapter(node, terms)",
    "#let render-folders(folders, terms, mode, level: 2)",
    "#let render-theory-chapter(folders, terms)",
    "#let render-practical-chapter(folders, terms)",
    "#let render-section-title(item)",
    "#let render-section-definition(item, terms)",
    "render-section-title(node.section)",
    "definition:",
    "document_enabled:",
    "document_intro:",
    "document_body:",
    "document_summary:",
    "theory_intro:",
    "theory_body:",
    "theory_summary:",
    "practical_intro:",
    "practical_body:",
    "practical_summary:",
):
    if required not in schema_source:
        fail(f"concept schema missing canonical field/renderer: {required}")
for forbidden in (
    'type in ("parent", "child"',
    'edge.type == "parent"',
    'edge.type == "child"',
    "node.section.heading",
):
    if forbidden in schema_source:
        fail(f"structural concept relations/manual headings must not drive section hierarchy: {forbidden}")

catalog_source = concept_catalog.read_text(encoding="utf-8")
for required in (
    '"manuscript/introduction/index.typ"',
    '"manuscript/results/index.typ"',
    '"manuscript/conclusion/index.typ"',
    '"manuscript/appendices/index.typ"',
    '"development-environment/index.typ"',
    '"language-models/index.typ"',
    '"agentic-engineering/index.typ"',
    "#let folders = (",
    "#let vocabulary = build-vocabulary(folders)",
    "#let render-introduction() = render-document-chapter(introduction.node, vocabulary)",
    "#let render-theory() = render-theory-chapter(folders, vocabulary)",
    "#let render-practical() = render-practical-chapter(folders, vocabulary)",
    "#let render-results() = render-document-chapter(results.node, vocabulary)",
    "#let render-conclusion() = render-document-chapter(conclusion.node, vocabulary)",
    '#let render-appendices() = render-folders((appendices.node,), vocabulary, "document", level: 1)',
):
    if required not in catalog_source:
        fail(f"concept catalog missing folder-driven composition contract: {required}")

for forbidden_dir in (
    concept_root / "01-development-environment",
    concept_root / "02-language-models",
    concept_root / "03-agentic-engineering",
):
    if forbidden_dir.exists():
        fail(f"legacy numbered concept directory must not reappear: {forbidden_dir}")

concept_paths = tuple(
    sorted(
        path for path in concept_root.rglob("*.typ")
        if path.name != "index.typ" and path != concept_schema and path != concept_catalog
    )
)
if len(concept_paths) < 38:
    fail(f"concept catalog unexpectedly small: {len(concept_paths)} files")

all_concept_keys = []
for path in concept_paths:
    match = re.search(r'key:\s*"([^"]+)"', path.read_text(encoding="utf-8"))
    if match:
        all_concept_keys.append(match.group(1))
duplicate_concept_keys = sorted({k for k in all_concept_keys if all_concept_keys.count(k) > 1})
if duplicate_concept_keys:
    fail(f"canonical concepts contain duplicate stable keys: {duplicate_concept_keys}")
for path in concept_paths:
    source = path.read_text(encoding="utf-8")
    for required in (
        "#let terminology = define-term(",
        "#let item = concept(",
    ):
        if required not in source:
            fail(f"concept file does not own its canonical record: {path}: {required}")
    for forbidden in ("default-name-type:", "keyword-name-type:", "name-type:", "name-language:", "name-separator:", "name-type-separator:", "name-order:"):
        if forbidden in source:
            fail(f"concept contains an alternate term-name rendering option: {path}: {forbidden}")
    if "related:" in source:
        fail(f"legacy concept relation field remains: {path}")
    if 'type: "parent"' in source or 'type: "child"' in source:
        fail(f"structural relation remains in concept file: {path}")
    for rel_target in re.findall(r'target:\s*"([^"]+)"', source):
        if rel_target not in all_concept_keys:
            fail(f"unknown relation target {rel_target!r} in {path}")

# Folder indexes are the sole source of section hierarchy. Concepts inside a folder
# render continuously; only a child folder can introduce another section heading.
section_index_paths = tuple(
    sorted(
        path for section in section_dirs
        for path in section.rglob("index.typ")
    )
)
for path in section_index_paths:
    source = path.read_text(encoding="utf-8")
    if "#let node = folder(" not in source:
        fail(f"folder index is not a structural folder manifest: {path}")
    if "#let item = section(" in source:
        fail(f"legacy section record remains in folder manifest: {path}")

section_concept_paths = set()
for manifest in section_index_paths:
    source = manifest.read_text(encoding="utf-8")
    match = re.search(r'#import\s+"([^"]+)"\s+as\s+section', source)
    if match is not None:
        section_concept_paths.add((manifest.parent / match.group(1)).resolve())

for path in section_concept_paths:
    source = path.read_text(encoding="utf-8")
    if re.search(r"^\s*heading\s*:", source, re.MULTILINE):
        fail(f"folder section concept must not define a manual heading renderer: {path}")

rendered_concept_paths = tuple(
    path for path in concept_paths
    if "theory_enabled: true" in path.read_text(encoding="utf-8")
    or "practical_enabled: true" in path.read_text(encoding="utf-8")
    or path.resolve() in section_concept_paths
)
rendered_manuscript_paths = (
    *section_index_paths,
    *rendered_concept_paths,
)
rendered_manuscript_text = "\n".join(
    path.read_text(encoding="utf-8") for path in rendered_manuscript_paths
)
unused_concepts = []
for path in concept_paths:
    source = path.read_text(encoding="utf-8")
    if "theory_enabled: true" in source or "practical_enabled: true" in source or "document_enabled: true" in source:
        continue
    match = re.search(r'key:\s*"([^"]+)"', source)
    if match is None:
        fail(f"concept is missing a stable key: {path}")
    key = match.group(1)
    if path.resolve() in section_concept_paths:
        continue
    if f"terms.{key}" not in rendered_manuscript_text and f"{key}.item" not in rendered_manuscript_text:
        unused_concepts.append(f"{path}:{key}")
if unused_concepts:
    fail("canonical concepts not utilized by the thesis: " + ", ".join(unused_concepts))

required_folder_manifests = {
    "development": concept_root / "development-environment/index.typ",
    "git": concept_root / "development-environment/version-control/git/index.typ",
    "language_model": concept_root / "language-models/language-model/index.typ",
    "agentic": concept_root / "agentic-engineering/index.typ",
    "harness": concept_root / "agentic-engineering/agent-harness/index.typ",
    "prompt_engineering": concept_root / "agentic-engineering/prompt-engineering/index.typ",
    "agent_loop": concept_root / "agentic-engineering/agent-harness/agent-loop/index.typ",
    "tool_calling": concept_root / "agentic-engineering/agent-harness/tool-calling/index.typ",
    "context_engineering": concept_root / "agentic-engineering/agent-harness/context-engineering/index.typ",
}
for name, manifest in required_folder_manifests.items():
    if not manifest.is_file():
        fail(f"required structural concept folder missing: {name}: {manifest}")

git_source = required_folder_manifests["git"].read_text(encoding="utf-8")
if git_source.find("required_checks.item") >= git_source.find("branch_protection.item"):
    fail("Branch Protection must remain after Required Checks within the Git folder")

agentic_source = required_folder_manifests["agentic"].read_text(encoding="utf-8")
if agentic_source.find("prompt_engineering.node") >= agentic_source.find("agent_harness.node"):
    fail("Prompt Engineering folder must remain before Agent Harness")

concept_text = "\n".join(path.read_text(encoding="utf-8") for path in concept_paths)
for required in (
    "#finalized[Plánování \\[Planning\\]]",
    "#finalized[Pull Request]",
    "#finalized[Větve (Branches)]",
    "#finalized[Slučování změn (Commit and Merge)]",
    "#finalized[Požadované kontroly (Required Checks)]",
    "Ochrana větví (Branch Protection)",
    "#finalized[Tokeny, tokenizace a Vektorová reprezentace \\[Embedding\\]]",
    '#finalized[#term(terms.embedding, render: "both", detail-language: "cs", detail-style: "inline") @mikolov2013word2vec',
    "Monolitická agentní smyčka selhává při řešení komplexních, vícefázových úloh.",
    "caption: [#finalized[Architektura autonomní ReAct smyčky (Reasoning + Acting)",
):
    if required not in concept_text:
        fail(f"migrated concept content missing approved contract: {required}")

for forbidden in (
    "Větve (Branches) a izolace kódu",
    "Slučování změn (Squash and Merge)",
    "=== Spouštění nástrojů",
    "Běhové prostředí nástrojů a pískoviště (Sandbox)",
    "Agent v tomto pojetí nevystupuje jako černá skříňka s proprietárním protokolem",
):
    if forbidden in concept_text:
        fail(f"legacy theoretical concept wording returned: {forbidden}")

if "Agentic AI (Agentické AI)" not in schema_source:
    fail("theory chapter title must be finalized as Agentic AI (Agentické AI)")
if "Agentické AI: Vymezení konceptů - Teoretická část" in schema_source:
    fail("legacy theory chapter title must not return")

gjkt_source = (template_root / "template.typ").read_text(encoding="utf-8")
for required in (
    "translation(cs: [Klíčová slova], en: [Keywords])",
    "render-keywords()",
    'separator: "paren"',
    'order: "en-cs"',
    'nadpis-bez-cisla[#finalized[#ui-label([Seznam obrázků a tabulek], [List of figures and tables])]]',
    'ui-label([Seznam příloh], [List of appendices])',
    '<body-end-anchor>',
):
    if required not in gjkt_source:
        fail(f"GJKT template missing terminology/back-matter contract: {required}")
for forbidden in (
    "render-index",
    'ui-label([Rejstřík], [Index])',
    "chapter-title-page",
    "appendix-mode-state",
):
    if forbidden in gjkt_source:
        fail(f"removed GJKT presentation/index machinery must not return: {forbidden}")
if '.before(<body-end-anchor>, inclusive: false)' not in gjkt_source:
    fail("core-text extent must stop before appendices")

figures_tables_title = 'ui-label([Seznam obrázků a tabulek], [List of figures and tables])'
if gjkt_source.count(figures_tables_title) != 1:
    fail("Seznam obrázků a tabulek must render exactly once")
if gjkt_source.index(figures_tables_title) < gjkt_source.index("#let prilohy(body)"):
    fail("Seznam obrázků a tabulek must live in the appendix/back-matter renderer")

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
    *sorted(Path("concepts").glob("*.typ")),
    *sorted(Path("concepts").rglob("*.typ")),
):
    source = path.read_text(encoding="utf-8")
    imports = active_typst_imports(source)
    if any("packages/odborna-prace-template" in line for line in imports):
        fail(f"legacy package import remains in {path}")
    if path.name != "thesis.typ" and any("templates/gjkt-odborna-prace" in line for line in imports):
        fail(f"manuscript bypasses template registry in {path}")

# Concept files contain semantic content only. Structural page/layout directives
# belong to the selected document template so the same manuscript can be rendered
# by another template without editing concept sources.
for path in sorted(Path("concepts").rglob("*.typ")):
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

thesis_source = Path("thesis.typ").read_text(encoding="utf-8")
web_publication_source_for_concepts = Path("web-publication.typ").read_text(encoding="utf-8")
for source_name, source in (("thesis.typ", thesis_source), ("web-publication.typ", web_publication_source_for_concepts)):
    if '"concepts/index.typ"' not in source:
        fail(f"{source_name} must import the canonical concept catalog")
    for renderer in ("render-introduction", "render-theory", "render-practical", "render-results", "render-conclusion", "render-appendices"):
        if f"#{renderer}()" not in source:
            fail(f"{source_name} must render {renderer} from concepts/index.typ")
    if "kapitoly/" in source:
        fail(f"{source_name} must not reference the removed kapitoly/ compatibility layer")

if "#show cite: it => super(it)" not in web_publication_source_for_concepts:
    fail("web publication citation markers must render as superscripts")

# Shared terminology must remain declarative and centralized.
registry_source = Path("templates/registry.typ").read_text(encoding="utf-8")
if '#import "terms.typ": vocabulary' not in registry_source or "#let terms = vocabulary" not in registry_source:
    fail("template registry must export the shared terminology vocabulary")

metadata_source = Path("metadata.typ").read_text(encoding="utf-8")
if 'DarkFactory: Umělá inteligence v praxi - Agentické a harnessové inženýrství' not in metadata_source:
    fail("canonical Czech work title must use the finalized three-part title")
finalized_annotation_cs = (
    "cs: finalized[\n"
    "      Tato odborná práce se zabývá principy agentického inženýrství (_agentic engineering_):\n"
    "      efektivními inženýrskými praktikami pro vývoj pomocí umělé inteligence prostřednictvím\n"
    "      agentických systémů a architekturou těchto systémů. Praktickým přínosem práce je návrh\n"
    "      a implementace systému DarkFactory — agentního harnessu instalovatelného jako aplikace\n"
    "      pro platformu GitHub (GitHub App). Systém usiluje o maximální možnou míru automatizace\n"
    "      vývojového cyklu od interpretace požadavků v GitHub Issues, přes plánování, až po vývoj\n"
    "      kódu a sloučení změn. Práce reflektuje, že současné agentní systémy nelze vnímat\n"
    "      jako plně autonomní: jazykové modely vyžadují deterministické mantinely, správu kontextu\n"
    "      a zapojení člověka (_Human-in-the-loop_).\n"
    "    ]"
)
finalized_annotation_en = (
    "en: finalized[\n"
    "      This thesis examines the principles of agentic engineering: effective engineering\n"
    "      practices for development with artificial intelligence through agentic systems and\n"
    "      the architecture of these systems. The practical contribution of the thesis is the\n"
    "      design and implementation of DarkFactory — an agentic harness installable as a GitHub App.\n"
    "      The system aims to maximize automation of the development lifecycle, from interpreting\n"
    "      requirements in GitHub Issues, through planning, to code development and merging changes.\n"
    "      The thesis reflects that current agentic systems cannot be regarded as fully autonomous:\n"
    "      language models require deterministic guardrails, context management, and human involvement\n"
    "      (_Human-in-the-loop_).\n"
    "    ]"
)
for annotation in (finalized_annotation_cs, finalized_annotation_en):
    if annotation not in metadata_source:
        fail("Czech and English annotations must remain fully finalized and mutually aligned")
for legacy in (
    "sémantické analýzy požadavků",
    "technické plánování",
    "generování kódu",
    "vystavení pull requestu",
    "bez sémantického posunu",
    "proti uvíznutí",
    "v nekonečných cyklech",
    "formou schvalovacích bran",
    "through approval gates",
    "against becoming stuck in",
    "infinite loops",
):
    if legacy in metadata_source:
        fail(f"legacy annotation wording must not return: {legacy}")

terms_source = Path("templates/terms.typ").read_text(encoding="utf-8")
if '#import "../concepts/index.typ" as catalog' not in terms_source:
    fail("templates/terms.typ must be a compatibility projection of concepts/")
if "#let vocabulary = catalog.vocabulary" not in terms_source:
    fail("templates/terms.typ must export the concept-built vocabulary")
if "define-term(" in terms_source:
    fail("templates/terms.typ must not remain a second terminology database")

concept_source_text = "\n".join(path.read_text(encoding="utf-8") for path in concept_paths)
if 'proper: translation(cs: "Agentické inženýrství", en: "Agentic Engineering")' not in concept_source_text:
    fail("Agentic Engineering Czech canonical term must be Agentické inženýrství")
if 'proper: translation(cs: "Agentní harness", en: "Agent Harness")' not in concept_source_text:
    fail("canonical harness proper term must be Agentní harness [Agent Harness]")
if 'industry: translation(cs: "Agent Harness", en: "Agent Harness")' not in concept_source_text:
    fail("canonical harness industry term must be Agent Harness")
for legacy_harness in ("Řídicí systém", "Control Harness", "Řídicí postroj", "The control harness"):
    if legacy_harness in concept_source_text:
        fail(f"legacy harness terminology must not return: {legacy_harness}")
if 'proper: translation(cs: "Agentní inženýrství", en: "Agentic Engineering")' in concept_source_text:
    fail("legacy Agentní inženýrství canonical term must not return")
if 'proper: translation(cs: "Rozšíření", en: "Plugins")' not in concept_source_text:
    fail("Plugins Czech proper term must remain Rozšíření")
if "Zásuvné moduly" in concept_source_text:
    fail("legacy Czech Plugins term Zásuvné moduly must not return")

term_ids = re.findall(r'id:\s*"([^"]+)"', concept_source_text)
duplicate_term_ids = sorted({term_id for term_id in term_ids if term_ids.count(term_id) > 1})
if duplicate_term_ids:
    fail(f"canonical terminology contains duplicate stable ids: {duplicate_term_ids}")

required_term_ids = {
    "mcp", "skills", "script", "plugins", "hook", "chatbot", "agent", "token",
    "tokenizer", "language-model", "transformer", "context-window", "context-compaction",
    "context-rot", "human-in-the-loop", "agentic-engineering", "software-engineering",
    "pull-request", "continuous-integration", "github-actions", "dag", "container",
    "kv-cache", "turn", "context-engineering", "prompt-engineering", "loop-engineering",
    "graph-engineering", "rag", "merge", "squash", "branch",
}
missing_term_ids = sorted(required_term_ids - set(term_ids))
if missing_term_ids:
    fail(f"canonical terminology missing required concepts: {missing_term_ids}")

required_term_keys = (
    "mcp", "skills", "script", "plugins", "hook", "chatbot", "agent", "token",
    "tokenizer", "language_model", "transformer", "context_window", "compaction",
    "context_rot", "human_in_the_loop", "agentic_engineering", "software_engineering",
    "pull_request", "continuous_integration", "github_actions", "dag", "container",
    "kv_cache", "turn", "context_engineering", "prompt_engineering", "loop_engineering",
    "graph_engineering", "rag", "merge", "squash", "branch",
)
for term_key in required_term_keys:
    if f'key: "{term_key}"' not in concept_source_text:
        fail(f"canonical terminology missing public concept key: {term_key}")

for path in concept_paths:
    source = path.read_text(encoding="utf-8")
    if '#term("' in source or "explanation:" in source:
        fail(f"concept contains an ad-hoc term definition instead of canonical terms.<id>: {path}")
    if "#accepted[#diff" in source or "#finalized[#diff" in source:
        fail(f"accepted/finalized content must not retain a diff: {path}")
    raw_bold = re.search(r"(?<!\\*)\\*[^*\\n]+\\*(?!\\*)", source)
    if raw_bold:
        fail(
            f"concept contains raw bold emphasis; use a heading or canonical term instead: "
            f"{path}: {raw_bold.group(0)}"
        )

# Legacy review marker API must not return.
for path in (
    Path("templates/common.typ"),
    Path("templates/registry.typ"),
    Path("templates/gjkt-odborna-prace/template.typ"),
    Path("metadata.typ"),
    Path("AGENTS.md"),
    *sorted(Path("concepts").rglob("*.typ")),
):
    source = path.read_text(encoding="utf-8")
    for legacy in ("#confirmed[", "#let confirmed", "common.confirmed"):
        if legacy in source:
            fail(f"legacy confirmed review state remains in {path}: {legacy}")

viewer_required = (
    Path("web/package.json"),
    Path("web/components.json"),
    Path("web/rsbuild.config.ts"),
    Path("web/biome.json"),
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
    Path("web/vite.config.ts"),
):
    if legacy.exists():
        fail(f"legacy static viewer asset must not remain: {legacy}")

package = json.loads(Path("web/package.json").read_text(encoding="utf-8"))
dependencies = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
for dependency in (
    "react",
    "react-dom",
    "typescript",
    "@rsbuild/core",
    "@rsbuild/plugin-react",
    "@rsbuild/plugin-tailwindcss",
    "@biomejs/biome",
    "motion",
    "@dagrejs/dagre",
    "lucide-animated",
    "lucide-react",
    "pdfjs-dist",
    "@monaco-editor/react",
    "monaco-editor",
    "react-markdown",
    "rehype-raw",
    "remark-gfm",
    "@radix-ui/react-tooltip",
    "@radix-ui/react-context-menu",
    "@radix-ui/react-dropdown-menu",
    "tailwindcss",
):
    if dependency not in dependencies:
        fail(f"React viewer missing required dependency: {dependency}")

for legacy_dependency in ("vite", "@vitejs/plugin-react", "@tailwindcss/vite"):
    if legacy_dependency in dependencies:
        fail(f"legacy Vite dependency must not remain: {legacy_dependency}")

scripts = package.get("scripts", {})
for script_name, required in (
    ("dev", "rsbuild dev"),
    ("build", "rsbuild build"),
    ("lint", "biome lint"),
    ("format", "biome format --write"),
    ("check", "biome lint"),
):
    if required not in scripts.get(script_name, ""):
        fail(f"web package script {script_name!r} missing Rsbuild/Biome contract: {required}")

app_source = Path("web/src/app.tsx").read_text(encoding="utf-8")
for required in (
    "TooltipAction",
    "PanelLeftRightIcon",
    "MinusIcon",
    "PlusIcon",
    "RefreshCwIcon",
    "FolderTreeIcon",
    "RendererPicker",
    "FormatPicker",
    "CompiledArtifactView",
    "ArtifactFormat",
    "MaximizeIcon",
    "activitybar",
    "status-left",
    "status-actions",
    "identity-separator",
    "motion.section",
):
    if required not in app_source:
        fail(f"React viewer missing UI contract: {required}")
if app_source.count('className="identity-separator"') < 1:
    fail("toolbar path must preserve work/chapter separation")
for required in ('format={format}', 'pdfHref={pdfTarget}', 'markdownHref={markdownTarget}', 'htmlHref={htmlTarget}'):
    if required not in app_source:
        fail(f"compiled-format path selector missing contract: {required}")

for required in ('className="path-page-switcher"', 'className="path-page-control"', 'label="Previous page"', 'label="Next page"'):
    if required not in app_source:
        fail(f"page navigation missing contract: {required}")
if app_source.index('className="path-page-switcher"') > app_source.index('label="Refresh document"'):
    fail("page navigation must be left of the refresh button")

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
    "EyeIcon",
    "BracesIcon",
    "ListTreeIcon",
    'label: "View"',
    'label: "Edit"',
    'label: "Raw"',
):
    if required not in app_source:
        fail(f"viewer path controls missing icon/chapter/mode contract: {required}")
for required in (
    'type AppearanceMode = "light" | "dark" | "oled"',
    "AppearancePicker",
    'stored === "light" || stored === "dark" || stored === "oled"',
    'data.theme === "light" || data.theme === "oled"',
    'label: "OLED"',
    'names={active.icon}',
):
    if required not in app_source:
        fail(f"viewer missing three-mode appearance contract: {required}")
if 'label="Home"' in app_source:
    fail("viewer toolbar must not contain a Home button")
if 'className="page-control"' in app_source:
    fail("legacy bottom-status page switcher must not return")
if "peerTarget" in app_source:
    fail("Viewer/Edit switching must not use a legacy peer control")
if "window.location.href =" in app_source:
    fail("internal viewer navigation must not reload the fullscreen shell")
for required in ("window.history.pushState", '"popstate"', "navigateViewer", "onNavigate"):
    if required not in app_source:
        fail(f"fullscreen-preserving viewer routing missing contract: {required}")
if "Switch Final / Koncept / Review" in app_source or "Switch Compiled / Koncept / Raw" in app_source:
    fail("legacy mode labels must not remain")
for required in (
    '<fieldset className="renderer-picker" aria-label="Renderer">',
    '<TooltipContent>Renderer</TooltipContent>',
    'label: "View"',
    'label: "Edit"',
    'label: "Raw"',
    'requestedMode === "raw"',
    'mode: "raw"',
    "rawHref={rawTarget}",
    'artifactFilename(selectedVariant, "raw", format)',
    'const targetMode: ViewerMode = viewMode === "split" ? "final" : mode',
    '<RawArtifactView path={renderArtifactPath} format={format}',
):
    if required not in app_source:
        fail(f"viewer missing View/Edit/Raw renderer contract: {required}")
if "function ModePicker(" in app_source or 'className="mode-select"' in app_source:
    fail("Renderer must be a direct multi-button control, not the legacy dropdown")
if 'mode === "raw"\n      ? "markdown"' in app_source:
    fail("Raw mode must preserve the selected document type")
for required in (
    "ActivityBar",
    'label="Contents"',
    'label="Files"',
    "RepoFilesPanel",
    'activityPanel === "contents"',
    'activityPanel === "files"',
    'sidebarHidden={activityPanel !== "contents"}',
    "ContextMenu",
    "ContextMenuTrigger",
    "ContextMenuContent",
    "ContextMenuItem",
    "Move Activity Bar",
    "useCommand",
    'id: "toggle-sidebar"',
    'key: "b"',
    "primaryModifier: true",
    "lastActivityPanel",
    "useContentIndex",
    'content_index?: string',
    'contentIndex={contentIndex}',
):
    if required not in app_source:
        fail(f"viewer missing merged Contents/Files activity-command contract: {required}")
if 'label="Pages"' in app_source or 'active === "pages"' in app_source:
    fail("page previews must be merged into Contents, not exposed as a separate activity item")
for required in (
    '<nav className="path-page-switcher" aria-label="Page navigation">',
    '<fieldset className="renderer-picker" aria-label="Renderer">',
):
    if required not in app_source:
        fail(f"viewer missing semantic navigation/control contract: {required}")
for required in (
    '<TooltipContent>Language</TooltipContent>',
    'aria-label="Language"',
    "languageDisplayName",
    '<TooltipContent>File type</TooltipContent>',
    'aria-label="File type"',
    'extension: ".pdf"',
    'extension: ".md"',
    'extension: ".html"',
    'className="status-select-copy"',
):

    if required not in app_source:
        fail(f"status selector contract missing: {required}")
if "Switch language version" in app_source or "Switch document type" in app_source:
    fail("status selectors must use the concise Language and File type labels")

if '<div className="status-center">\n          {manifest?.commit' not in app_source:
    fail("commit SHA must be centered in the status bar")
if '<div className="status-actions">\n          {pagesAvailable && (' not in app_source:
    fail("PDF zoom controls must live in the right status actions")

compiled_artifact_source = Path("web/src/compiled-artifact.tsx").read_text(encoding="utf-8")
for required in (
    'fetch(path, { cache: "no-store" })',
    'src={path}',
    'format === "html"',
    '<ReactMarkdown',
    'remarkPlugins={[remarkGfm]}',
    'rehypePlugins={[rehypeRaw]}',
    'export function RawArtifactView',
    'Editor, { loader } from "@monaco-editor/react"',
    'import * as monaco from "monaco-editor"',
    'new URL("monaco-editor/editor/editor.worker", import.meta.url)',
    'new URL("monaco-editor/language/html/html.worker", import.meta.url)',
    'response.arrayBuffer()',
    'hexDump(bytes)',
    'language={language}',
    'readOnly: true',
    'theme={editorTheme}',
    'theme: "dark" | "light" | "oled"',
):
    if required not in compiled_artifact_source:
        fail(f"artifact viewer missing rendered/Monaco contract: {required}")

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
    "EyeIcon: Eye",
    "BracesIcon: Braces",
    "FilesIcon: Files",
    "FolderIcon: Folder",
    "FolderTreeIcon: FolderTree",
    "ListTreeIcon: ListTree",
    "ListIcon: List",
    "PanelLeftRightIcon: PanelsLeftRight",
    "BookOpenIcon: BookOpen",
    "CircleIcon: Circle",
):
    if required not in icon_source:
        fail(f"viewer icon adapter missing guaranteed static fallback: {required}")
if 'label="Refresh document"' not in app_source or "refreshRevision" not in app_source:
    fail("viewer must expose a document-only refresh action")
if "window.location.reload()" in app_source:
    fail("document refresh must not reload the shell or exit fullscreen")

viewer_css_source = Path("web/src/viewer.css").read_text(encoding="utf-8")
for required in (
    '@import "./publication.css"',
    '--header-height: 40px',
    'grid-template-rows: var(--header-height) minmax(0, 1fr) var(--status-height)',
    'flex: 0 0 36px',
    '.activity-action',
    'align-items: center',
    '.navigation-sidebar',
    '.navigation-outline-section',
    '.navigation-pages-body',
    '.contents-tree',
    '.renderer-picker',
    '.renderer-option.active',
    '.status-select-copy',
    'display: inline-flex',
    'align-items: center',
    'html[data-theme="oled"]',
    '--bg: #000000',
    '--toolbar: #000000',
    '--sidebar: #000000',
    '--surface: #000000',
    '--page-shadow: none',
    '.appearance-menu',
):
    if required not in viewer_css_source:
        fail(f"viewer OLED appearance contract missing: {required}")

template_source = Path("templates/gjkt-odborna-prace/template.typ").read_text(encoding="utf-8")
for required in (
    "#let cover-title(meta)",
    "DarkFactory#linebreak()",
    "Agentické a harnessové inženýrství:#linebreak()",
    "Umělá inteligence v praxi",
    "show cite: it => super(it)",
):
    if required not in template_source:
        fail(f"title page/reference styling missing contract: {required}")
cover_title_source = template_source[
    template_source.index("#let cover-title(meta)") : template_source.index("#let titulni-list(meta")
]
title_layout = (
    "      DarkFactory#linebreak()\n"
    "      Agentické a harnessové inženýrství:#linebreak()\n"
    "      Umělá inteligence v praxi\n"
)
if title_layout not in cover_title_source:
    fail("title page lines must be DarkFactory, Agentické a harnessové inženýrství:, Umělá inteligence v praxi")
if '"KONCEPT"' in template_source:
    fail("review template must not add the KONCEPT page-background watermark")

thesis_source = Path("thesis.typ").read_text(encoding="utf-8")
if '"KONCEPT"' in thesis_source:
    fail("thesis composition must not force the KONCEPT review watermark")
if 'onClick={canSplit ? () => navigateViewer(splitTarget) : undefined}' not in app_source:
    fail("separate Review action must expose the comparison view without reloading")

pdf_source = Path("web/src/pdf-document.tsx").read_text(encoding="utf-8")
for required in (
    "dagre.layout",
    "TextLayer",
    "AnnotationLayer",
    "ContextMenu",
    "Minimap",
    "DocumentNavigationPanel",
    "FilesIcon",
    'aria-label="Contents and page previews"',
    "navigation-outline-section",
    "navigation-pages-section",
    "class AnnotationLinkService",
    "goToDestination",
    "getDestinationHash",
    "addLinkAttributes",
    "getPageIndex",
    "installAnnotationInteractions",
    '"[data-annotation-id], [data-element-id], a"',
    "dataset.annotationId",
    "installLinkOverlays",
    "convertToViewportRectangle",
    "pdf-link-overlay",
    "stopImmediatePropagation",
    "window.open(annotation.url",
    "loadOutlineChapters",
    "resolveSemanticChapters",
    "normalizeHeadingText",
    "GlobalWorkerOptions.workerSrc",
    '"pdfjs-dist/build/pdf.worker.mjs"',
    "pdf.getOutline",
    "item.items",
    "level: number",
    "chapters: DocumentChapter[]",
):
    if required not in pdf_source:
        fail(f"React PDF viewer missing interaction contract: {required}")
if "PDFLinkService" in pdf_source or "setViewer({" in pdf_source:
    fail("custom PDF renderer must not depend on a partial PDFViewer/PDFLinkService surrogate")
if "GlobalWorkerOptions.workerPort" in pdf_source:
    fail("PDF.js must not reuse a shared workerPort across document loading tasks")

for legacy_worker_query in (
    "monaco-editor/editor/editor.worker?worker",
    "monaco-editor/language/html/html.worker?worker",
    "pdf.worker.mjs?url",
):
    if legacy_worker_query in compiled_artifact_source or legacy_worker_query in pdf_source:
        fail(f"Vite-style worker query must not remain: {legacy_worker_query}")

main_source = Path("web/src/main.tsx").read_text(encoding="utf-8")
if "<ViewerApp />" not in main_source or "PublicationIndex" in main_source:
    fail("site root must open directly into the viewer")
for required in (
    'const profileName = params.get("profile") || "school"',
    'const mode: ViewerMode =',
    'mode === "raw"',
    'requestedFormat === "markdown"',
    'requestedFormat === "html"',
    'requestedMode === "raw"',
    'Loading school Viewer PDF…',
):
    if required not in app_source:
        fail(f"viewer root missing school/viewer/edit/raw/PDF default contract: {required}")

rsbuild_source = Path("web/rsbuild.config.ts").read_text(encoding="utf-8")
for required in (
    '@rsbuild/core',
    '@rsbuild/plugin-react',
    '@rsbuild/plugin-tailwindcss',
    'index: "./src/main.tsx"',
    'viewer: "./src/main.tsx"',
    'assetPrefix: "./"',
    'entryName === "viewer"',
    '"./viewer.html"',
    '"./index.html"',
):
    if required not in rsbuild_source:
        fail(f"Rsbuild config missing multi-page React contract: {required}")

biome_source = Path("web/biome.json").read_text(encoding="utf-8")
for required in (
    '"https://biomejs.dev/schemas/2.5.14/schema.json"',
    '"formatter"',
    '"linter"',
    '"recommended": true',
    '"assist"',
    '"organizeImports": "on"',
):
    if required not in biome_source:
        fail(f"Biome config missing formatter/linter/import contract: {required}")

tsconfig_source = Path("web/tsconfig.json").read_text(encoding="utf-8")
if '"@rsbuild/core/types"' not in tsconfig_source or '"vite/client"' in tsconfig_source:
    fail("TypeScript environment types must target Rsbuild, not Vite")
for html_path in (Path("web/index.html"), Path("web/viewer.html")):
    html_source = html_path.read_text(encoding="utf-8")
    if 'src="./src/main.tsx"' in html_source:
        fail(f"Rsbuild must inject the entry script into {html_path}; Vite-style script tag remains")

web_publication = Path("web-publication.typ")
web_exporter = Path("scripts/build_web_exports.py")
for required_path in (web_publication, web_exporter):
    if not required_path.is_file() or required_path.stat().st_size == 0:
        fail(f"missing compiled web publication source/tool: {required_path}")

publication_css = Path("web/src/publication.css")
if not publication_css.is_file() or publication_css.stat().st_size == 0:
    fail("missing shared HTML/Markdown publication stylesheet")
publication_css_source = publication_css.read_text(encoding="utf-8")
for required in (
    ".publication-surface",
    "font-family: Caladea, Cambria",
    "font-size: 12pt",
    "line-height: 1.5",
    "padding: 2.5cm 2.5cm 2.5cm 3cm",
    'nav[role="doc-toc"]',
):
    if required not in publication_css_source:
        fail(f"shared publication stylesheet missing PDF-aligned contract: {required}")

web_export_source = web_exporter.read_text(encoding="utf-8")
for required in (
    '"--features", "html"',
    '"--format", "html"',
    "html_to_markdown",
    'parser.add_argument("--source", default="web-publication.typ")',
    'output.with_suffix(".md")',
    'darkfactory-publication-style',
    'PUBLICATION_CSS = Path("web/src/publication.css")',
    'class="publication-surface"',
    'style_compiled_html',
    'html_to_markdown',
):
    if required not in web_export_source:
        fail(f"web exporter missing compiled HTML/Markdown contract: {required}")

web_publication_source = web_publication.read_text(encoding="utf-8")
for required in (
    "#outline(title: ui-label([Obsah], [Contents]), depth: 6)",
    'translation-heading(translation(cs: [Anotace], en: [Annotation]), separator: "paren", order: "en-cs")',
    'translation-heading(translation(cs: [Klíčová slova], en: [Keywords]), separator: "paren", order: "en-cs")',
    'ui-label([Seznam obrázků a tabulek], [List of figures and tables])',
    "heading.where(level: 1, supplement: [Příloha])",
    "#render-appendices()",
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
    "Monaco Raw + rendered Markdown + compiled Typst HTML",
    '"formats": ["pdf", "markdown", "html"]',
    '"modes": ["viewer", "edit", "raw"]',
    '"repo_tree": "repo-tree.json"',
    '"content_index": "content-index.json"',
    '"repository_url": "https://github.com/marius-patrik/DarkFactory-Paper"',
    '"Rsbuild"',
    '"Rspack"',
    '"Biome"',
    '"Monaco Editor"',
    "tracked_repo_tree",
    '["git", "ls-files", "-z"]',
    'SITE / "repo-tree.json"',
    'SITE / "content-index.json"',
    'static_assets = SITE / "static"',
    '"Rsbuild output contains no bundled static assets"',
    "HeadingIndexParser",
    "semantic_content_index",
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
