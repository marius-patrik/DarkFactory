#!/usr/bin/env python3
"""Sanity checks for the generated Typst publication matrix."""

from __future__ import annotations

import json
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
for semantic in ("confirmed", "unconfirmed", "diff", "term", "bilingual"):
    expected = f"#let {semantic} = common.{semantic}"
    if expected not in registry:
        fail(f"registry semantic helper is not routed through common.typ: {semantic}")

gjkt_source = (template_root / "template.typ").read_text(encoding="utf-8")
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

print(f"ok: validated {len(EXPECTED)} PDFs, template architecture, repository architecture, and release manifest")
