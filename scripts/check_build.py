#!/usr/bin/env python3
"""Sanity checks for the generated Typst publication matrix."""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

EXPECTED = (
    Path("out/prace.pdf"),
    Path("out/prace-cs.pdf"),
    Path("out/prace-en.pdf"),
    Path("out/prace-bilingual.pdf"),
    Path("out/prace-review.pdf"),
    Path("out/prace-cs-review.pdf"),
    Path("out/prace-en-review.pdf"),
    Path("out/prace-bilingual-review.pdf"),
)


def fail(message: str) -> None:
    raise SystemExit(f"build check failed: {message}")


for path in EXPECTED:
    if not path.is_file():
        fail(f"missing {path}")
    if path.stat().st_size < 1024:
        fail(f"{path} is unexpectedly small ({path.stat().st_size} bytes)")
    with path.open("rb") as handle:
        if handle.read(5) != b"%PDF-":
            fail(f"{path} is not a PDF")


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
        if path.stat().st_size < 1024:
            fail(f"{path} is unexpectedly small ({path.stat().st_size} bytes)")
        with path.open("rb") as handle:
            if handle.read(5) != b"%PDF-":
                fail(f"{path} is not a PDF")

    for final_name, review_name in (
        ("prace.pdf", "prace-review.pdf"),
        ("prace-cs.pdf", "prace-cs-review.pdf"),
        ("prace-en.pdf", "prace-en-review.pdf"),
        ("prace-bilingual.pdf", "prace-bilingual-review.pdf"),
    ):
        final = template_out / final_name
        review = template_out / review_name
        if final.read_bytes() == review.read_bytes():
            fail(f"template review output is byte-identical to final output: {template_name}/{final_name}")

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
for renderer in ("render-keywords", "render-encyclopedia"):
    if f"#let {renderer}" not in common_source:
        fail(f"missing shared terminology renderer: {renderer}")

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

chapter2_source = Path("kapitoly/02-teoreticka-cast.typ").read_text(encoding="utf-8")
finalized_scaling_title = (
    "=== #finalized[Škálování: Multiagentní systémy (Subagenti) a grafy "
    "(DAG workflows) \\[Scaling: Multiagent Systems (Subagents) and DAG "
    "Workflows (Graphs)\\]]"
)
if finalized_scaling_title not in chapter2_source:
    fail("section 2.3.8 must retain the finalized bilingual scaling title")
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

gjkt_source = (template_root / "template.typ").read_text(encoding="utf-8")
for front_matter_contract in (
    "translation(cs: [Klíčová slova], en: [Keywords])",
    "translation(cs: [Encyklopedie], en: [Encyclopedia])",
    "render-keywords()",
    "render-encyclopedia()",
):
    if front_matter_contract not in gjkt_source:
        fail(f"GJKT template missing terminology front-matter contract: {front_matter_contract}")

for forbidden in ('state("review-mode"', 'state("publication-profile"'):
    if forbidden in gjkt_source:
        fail("concrete templates must not own shared review/profile state")
if '#import "../common.typ"' not in gjkt_source:
    fail("GJKT template must consume the shared manuscript API")

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

terms_source = Path("templates/terms.typ").read_text(encoding="utf-8")
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
    "PanelLeftIcon",
    "PanelRightIcon",
    "ModePicker",
    "MaximizeIcon",
    "ContextMenu",
    "status-actions",
    "identity-separator",
    "motion.section",
):
    if required not in app_source:
        fail(f"React viewer missing UI contract: {required}")
if app_source.count('className="identity-separator"') < 3:
    fail("toolbar path must separate Home, work title, publication version, and Final/Review mode")
if "peerTarget" in app_source:
    fail("Final/Review switching must live in the path bar, not the toolbar action cluster")

icon_source = Path("web/src/components/animated-icon.tsx").read_text(encoding="utf-8")
for required in ("lucide-animated", "lucide-react", "STATIC_FALLBACKS"):
    if required not in icon_source:
        fail(f"viewer icon adapter missing fallback contract: {required}")

template_source = Path("templates/gjkt-odborna-prace/template.typ").read_text(encoding="utf-8")
if '"KONCEPT"' in template_source:
    fail("review template must not add the KONCEPT page-background watermark")

thesis_source = Path("thesis.typ").read_text(encoding="utf-8")
if '"KONCEPT"' in thesis_source:
    fail("thesis composition must not force the KONCEPT review watermark")
if 'splitHref={canSplit ? splitTarget : "#"}' not in app_source:
    fail("Final/Review path selector must also expose Split mode")

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
):
    if required not in pdf_source:
        fail(f"React PDF viewer missing interaction contract: {required}")
if "PDFLinkService" in pdf_source or "setViewer({" in pdf_source:
    fail("custom PDF renderer must not depend on a partial PDFViewer/PDFLinkService surrogate")

vite_source = Path("web/vite.config.ts").read_text(encoding="utf-8")
for required in ("@vitejs/plugin-react", "@tailwindcss/vite", "viewer.html", "index.html"):
    if required not in vite_source:
        fail(f"Vite config missing multi-page React contract: {required}")

site_builder = Path("scripts/build_site.py").read_text(encoding="utf-8")
for required in (
    'WEB_DIST = Path("web/dist")',
    "shutil.copytree(WEB_DIST, SITE)",
    '"React + PDF.js"',
    '"shadcn/ui"',
    '"Motion"',
    '"Dagre"',
):
    if required not in site_builder:
        fail(f"Pages builder missing React viewer publication contract: {required}")

manifest_path = Path(".github/darkfactory.json")
manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
release_assets = {Path(value) for value in manifest.get("release", {}).get("assets", [])}
expected_assets = set(EXPECTED)
if release_assets != expected_assets:
    missing = sorted(str(p) for p in expected_assets - release_assets)
    extra = sorted(str(p) for p in release_assets - expected_assets)
    fail(f"release asset matrix mismatch; missing={missing}, extra={extra}")

pairs = (
    (Path("out/prace.pdf"), Path("out/prace-review.pdf")),
    (Path("out/prace-cs.pdf"), Path("out/prace-cs-review.pdf")),
    (Path("out/prace-en.pdf"), Path("out/prace-en-review.pdf")),
    (Path("out/prace-bilingual.pdf"), Path("out/prace-bilingual-review.pdf")),
)
for final, review in pairs:
    if final.read_bytes() == review.read_bytes():
        fail(f"review output is byte-identical to final output: {final}")

print(f"ok: validated {len(EXPECTED)} canonical PDFs + {len(TEMPLATE_NAMES)} complete template matrices, architecture, and release manifest")
