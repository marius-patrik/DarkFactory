#!/usr/bin/env python3
"""Sanity checks for the generated Typst publication matrix."""

from __future__ import annotations

import json
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

viewer_sources = {
    "web/viewer.html": Path("web/viewer.html"),
    "web/viewer.css": Path("web/viewer.css"),
    "web/viewer.js": Path("web/viewer.js"),
    "web/icons.js": Path("web/icons.js"),
}
for name, path in viewer_sources.items():
    if not path.is_file() or path.stat().st_size == 0:
        fail(f"missing custom Pages viewer asset: {name}")

viewer_js = viewer_sources["web/viewer.js"].read_text(encoding="utf-8")
for required in (
    'viewMode = params.get("view") === "split"',
    'source: "paper-split"',
    'source: "paper-viewer"',
    "new pdfjsLib.TextLayer",
    "new pdfjsLib.AnnotationLayer",
    'addEventListener("contextmenu"',
    '"paper-viewer-sidebar-side"',
    '"paper-viewer-sidebar-mode"',
    'event.ctrlKey && !event.metaKey',
    'splitSyncScroll',
    'fetch("variants.json"',
):
    if required not in viewer_js:
        fail(f"custom viewer missing interaction contract: {required}")

viewer_html = viewer_sources["web/viewer.html"].read_text(encoding="utf-8")
for required in (
    'data-icon="HomeIcon"',
    'id="version-select"',
    'id="sync-scroll"',
    'id="sidebar-menu"',
    'class="statusbar"',
):
    if required not in viewer_html:
        fail(f"custom viewer shell missing UI contract: {required}")

icons_js = viewer_sources["web/icons.js"].read_text(encoding="utf-8")
if "lucide-animated@1.0.5" not in icons_js:
    fail("custom viewer must use the pinned lucide-animated icon runtime")

node = shutil.which("node")
if node:
    for script in (viewer_sources["web/viewer.js"], viewer_sources["web/icons.js"]):
        result = subprocess.run(
            [node, "--check", str(script)],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            fail(f"JavaScript syntax error in {script}: {result.stderr.strip()}")

site_builder = Path("scripts/build_site.py").read_text(encoding="utf-8")
for required in (
    'split_view = final_view + "&view=split"',
    '>Split</a>',
    'viewer.html?',
    '"work_title": WORK_TITLE',
    '"icons.js"',
    'profile=variant["profile"]',
):
    if required not in site_builder:
        fail(f"Pages builder missing viewer publication contract: {required}")

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
