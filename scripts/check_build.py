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

print(f"ok: validated {len(EXPECTED)} Typst PDF artifacts and release manifest")
