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
keyword_renderer = common_source[
    common_source.find("#let render-keywords()"):
    common_source.find("#let collect-canonical-terms")
]
if "finalized[" not in keyword_renderer:
    fail("generated keyword list must be wrapped in finalized state")

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
if "term, kw, terms" not in chapter1_source.splitlines()[0]:
    fail("chapter 1 must import canonical terms for the finalized Agent Harness reference")
for removed_motivation in (
    "Doporučení k motivaci",
    "fyzickou temnou továrnou",
    "montážní linka",
    "Vizuální metafora výrazně zlepší srozumitelnost pro komisi",
):
    if removed_motivation in chapter1_source:
        fail(f"removed motivation-diagram recommendation must not return: {removed_motivation}")
finalized_main_goal = (
    "=== #finalized[Hlavní cíl]\n\n"
    "#finalized[\n"
    "Vymezit teoretické principy agentického inženýrství (_agentic engineering_) "
    "a navrhnout modulární architekturu agent harnessu pro automatizovaný vývoj "
    "softwaru se zachováním lidského dohledu v klíčových rozhodovacích bodech.\n]"
)
if finalized_main_goal not in chapter1_source:
    fail("main thesis goal must remain finalized exactly as approved")

for required_heading in (
    "=== #finalized[Hlavní cíl]",
    "=== #finalized[Dílčí cíle]",
    "=== #finalized[Výzkumné otázky]",
):
    if required_heading not in chapter1_source:
        fail(f"chapter 1 pseudo-section must remain a real numbered heading: {required_heading}")

finalized_agent_harness = (
    "#finalized[\n"
    "Ústřední inženýrská otázka této práce proto nespočívá v tom, zda jazykový model "
    "dokáže napsat fragment kódu. Zkoumáme, jaká kontrolní a dozorčí architektura — "
    "značovaná jako #term(terms.harness, language: \"en\", name-type: \"industry\", "
    "register: true, linked: true, marker: false) — musí model obklopovat, aby bylo možné jeho "
    "výstupům v produkčním repozitáři spolehlivě důvěřovat a dosáhnout vysoké míry "
    "autonomie se zachováním lidského dohledu.\n]"
)
if finalized_agent_harness not in chapter1_source:
    fail("agent harness definition sentence must remain finalized with the approved wording")
if "označovaná jako *řídicí harness*" in chapter1_source:
    fail("legacy řídicí harness wording must not return")
for manuscript_path in (
    Path("kapitoly/01-uvod.typ"),
    Path("kapitoly/05-zaver.typ"),
    *sorted(Path("concepts").glob("*/*.typ")),
):
    manuscript_source = manuscript_path.read_text(encoding="utf-8")
    for legacy_harness in ("řídicí harness", "řídicího harnessu", "řídicím harnessu"):
        if legacy_harness in manuscript_source:
            fail(f"legacy Czech harness wording remains in {manuscript_path}: {legacy_harness}")

concept_root = Path("concepts")
concept_schema = concept_root / "schema.typ"
concept_catalog = concept_root / "index.typ"
section_dirs = (
    concept_root / "01-development-environment",
    concept_root / "02-language-models",
    concept_root / "03-agentic-engineering",
)
for required in (concept_schema, concept_catalog, *(section / "index.typ" for section in section_dirs)):
    if not required.is_file() or required.stat().st_size == 0:
        fail(f"missing concept-driven manuscript file: {required}")

schema_source = concept_schema.read_text(encoding="utf-8")
for required in (
    "#let concept(",
    "#let section(",
    "#let build-vocabulary(sections)",
    "#let render-theory-chapter(sections, terms)",
    "#let render-practical-chapter(sections, terms)",
    "theory_intro:",
    "theory_body:",
    "theory_summary:",
    "practical_intro:",
    "practical_body:",
    "practical_summary:",
):
    if required not in schema_source:
        fail(f"concept schema missing canonical field/renderer: {required}")

catalog_source = concept_catalog.read_text(encoding="utf-8")
for required in (
    '"01-development-environment/index.typ"',
    '"02-language-models/index.typ"',
    '"03-agentic-engineering/index.typ"',
    "#let vocabulary = build-vocabulary(sections)",
    "#let render-theory() = render-theory-chapter(sections, vocabulary)",
    "#let render-practical() = render-practical-chapter(sections, vocabulary)",
):
    if required not in catalog_source:
        fail(f"concept catalog missing dynamic composition contract: {required}")

concept_paths = tuple(
    sorted(
        path
        for section in section_dirs
        for path in section.glob("*.typ")
        if path.name != "index.typ"
    )
)
if len(concept_paths) < 38:
    fail(f"concept catalog unexpectedly small: {len(concept_paths)} files")
for path in concept_paths:
    source = path.read_text(encoding="utf-8")
    for required in (
        "#let terminology = define-term(",
        "#let item = concept(",
        "theory_intro:",
        "theory_body:",
        "theory_summary:",
        "practical_intro:",
        "practical_body:",
        "practical_summary:",
    ):
        if required not in source:
            fail(f"concept file does not own its complete canonical record: {path}: {required}")

section_sources = {
    section.name: (section / "index.typ").read_text(encoding="utf-8")
    for section in section_dirs
}
for name, source in section_sources.items():
    if "#let item = section(" not in source or "concepts: (" not in source:
        fail(f"section index is not a canonical ordered section record: {name}")

development_source = section_sources["01-development-environment"]
language_source = section_sources["02-language-models"]
agentic_source = section_sources["03-agentic-engineering"]
if "#finalized[Vývojové prostředí a praxe]" not in development_source:
    fail("section 2.1 must remain Vývojové prostředí a praxe")
if development_source.find("required_checks.item") >= development_source.find("branch_protection.item"):
    fail("Branch Protection must remain after Required Checks")
if language_source.find("agent.item") >= language_source.find("context_rot.item"):
    fail("language-model concept ordering changed unexpectedly")
if agentic_source.find("prompt_engineering.item") >= agentic_source.find("agent_loop.item"):
    fail("Prompt Engineering must remain before the agent-loop concept")

concept_text = "\n".join(path.read_text(encoding="utf-8") for path in concept_paths)
for required in (
    "#finalized[Správa verzí \\[Version Control\\]]",
    "#finalized[Plánování \\[Planning\\]]",
    "#finalized[Pull Request]",
    "#finalized[Větve (Branches)]",
    "#finalized[Slučování změn (Commit and Merge)]",
    "#finalized[Kontinuální integrace (CI a GitHub Actions)]",
    "#finalized[Požadované kontroly (Required Checks)]",
    "Ochrana větví (Branch Protection)",
    "#finalized[Tokeny, tokenizace a Vektorová reprezentace \\[Embedding\\]]",
    "#finalized[Vyvolávání nástrojů \\[Tool Calling\\]]",
    "Škálování: Multiagentní systémy (Subagenti) a grafy",
    "Monolitická agentní smyčka selhává při řešení komplexních, vícefázových úloh.",
    "caption: [#accepted[Architektura autonomní ReAct smyčky (Reasoning + Acting)",
):
    if required not in concept_text:
        fail(f"migrated concept content missing approved contract: {required}")

for forbidden in (
    "Větve (Branches) a izolace kódu",
    "Slučování změn (Squash and Merge)",
    "=== Spouštění nástrojů",
    "Běhové prostředí nástrojů a pískoviště (Sandbox)",
):
    if forbidden in concept_text:
        fail(f"legacy theoretical concept wording returned: {forbidden}")

chapter2_source = Path("kapitoly/02-teoreticka-cast.typ").read_text(encoding="utf-8")
chapter3_source = Path("kapitoly/03-prakticka-cast.typ").read_text(encoding="utf-8")
if '#import "../concepts/index.typ": render-theory' not in chapter2_source or "#render-theory()" not in chapter2_source:
    fail("chapter 2 must be a compatibility projection of the concept catalog")
if '#import "../concepts/index.typ": render-practical' not in chapter3_source or "#render-practical()" not in chapter3_source:
    fail("chapter 3 must be a compatibility projection of the concept catalog")
if "Teoretická část: Vymezení konceptu" in chapter2_source or "DarkFactory - Praktická část" in chapter3_source:
    fail("chapter 2/3 content must not be duplicated outside concepts/")

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
    *sorted(Path("concepts").glob("*.typ")),
    *sorted(Path("concepts").glob("*/*.typ")),
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
for path in (
    *sorted(Path("kapitoly").glob("*.typ")),
    *sorted(Path("concepts").glob("*.typ")),
    *sorted(Path("concepts").glob("*/*.typ")),
):
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
    if '"concepts/index.typ"' not in source or "#render-theory()" not in source or "#render-practical()" not in source:
        fail(f"{source_name} must render theory/practical chapters from concepts/index.typ")
    if 'include "kapitoly/02-teoreticka-cast.typ"' in source or 'include "kapitoly/03-prakticka-cast.typ"' in source:
        fail(f"{source_name} must not build chapter 2/3 from monolithic chapter files")

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

for path in sorted(Path("kapitoly").glob("*.typ")):
    source = path.read_text(encoding="utf-8")
    if '#term("' in source or "explanation:" in source:
        fail(f"chapter contains an ad-hoc term definition instead of terms.<id>: {path}")
    if "#accepted[#diff" in source or "#finalized[#diff" in source:
        fail(f"accepted/finalized content must not retain a diff: {path}")
    raw_bold = re.search(r"(?<!\*)\*[^*\n]+\*(?!\*)", source)
    if raw_bold:
        fail(
            f"chapter contains raw bold emphasis; use a heading or canonical term instead: "
            f"{path}: {raw_bold.group(0)}"
        )

# Legacy review marker API must not return.
for path in (
    Path("templates/common.typ"),
    Path("templates/registry.typ"),
    Path("templates/gjkt-odborna-prace/template.typ"),
    Path("metadata.typ"),
    Path("AGENTS.md"),
    *sorted(Path("kapitoly").glob("*.typ")),
    *sorted(Path("concepts").glob("*.typ")),
    *sorted(Path("concepts").glob("*/*.typ")),
):
    source = path.read_text(encoding="utf-8")
    for legacy in ("#confirmed[", "#let confirmed", "common.confirmed"):
        if legacy in source:
            fail(f"legacy confirmed review state remains in {path}: {legacy}")

viewer_required = (
    Path("web/package.json"),
    Path("web/components.json"),
    Path("web/rsbuild.config.ts"),\n    Path("web/biome.json"),
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
    'role="group" aria-label="Renderer"',
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
    'monaco-editor/editor/editor.worker?worker',
    'monaco-editor/language/html/html.worker?worker',
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
for required in ("#let cover-title(meta)", "DarkFactory:#linebreak()", "Umělá inteligence v praxi -#linebreak()", "Agentické a harnessové inženýrství"):
    if required not in template_source:
        fail(f"title page missing three-line title contract: {required}")
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
    "pdf.getOutline",
    "item.items",
    "level: number",
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
    "Monaco Raw + rendered Markdown + compiled Typst HTML",
    '"formats": ["pdf", "markdown", "html"]',
    '"modes": ["viewer", "edit", "raw"]',
    '"repo_tree": "repo-tree.json"',
    '"content_index": "content-index.json"',
    '"repository_url": "https://github.com/marius-patrik/DarkFactory-Paper"',
    '"Monaco Editor"',
    "tracked_repo_tree",
    '["git", "ls-files", "-z"]',
    'SITE / "repo-tree.json"',
    'SITE / "content-index.json"',
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
