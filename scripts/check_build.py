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

package_root = Path("packages/odborna-prace-template")
for required in (
    package_root / "typst.toml",
    package_root / "src/lib.typ",
    package_root / "src/wordometer.typ",
    package_root / "Makefile",
    package_root / "tests/smoke.typ",
):
    if not required.is_file():
        fail(f"missing internal template package file: {required}")

if Path("lib/odborna-prace.typ").exists() or Path("lib/wordometer.typ").exists():
    fail("legacy root lib/ template copies must not reappear")

for path in (
    Path("metadata.typ"),
    Path("thesis.typ"),
    *sorted(Path("kapitoly").glob("*.typ")),
):
    source = path.read_text(encoding="utf-8")
    if 'lib/odborna-prace.typ' in source:
        fail(f"legacy template import remains in {path}")

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

print(f"ok: validated {len(EXPECTED)} Typst PDF artifacts, repository architecture, and release manifest")
