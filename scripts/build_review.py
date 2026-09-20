#!/usr/bin/env python3
"""Compile a review PDF with the canonical raw/final word/character count.

The final count is obtained from the same Typst document, template and publication
profile with review mode disabled. The review build then receives those values as
sys.inputs while computing its own review count normally inside the template.
Review PDFs disable accessibility tags because Typst 0.15.x can hit a Krilla
tag-tree serializer panic on the review-only markup path. Final PDFs retain the
default tagged-PDF export.
"""

from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path


def run(args: list[str], *, capture: bool = False) -> str:
    result = subprocess.run(
        args,
        check=True,
        text=True,
        stdout=subprocess.PIPE if capture else None,
    )
    return result.stdout if capture else ""


parser = argparse.ArgumentParser()
parser.add_argument("--typst", default="typst")
parser.add_argument("--font-path", action="append", default=[])
parser.add_argument("--book", required=True)
parser.add_argument("--template", required=True)
parser.add_argument("--profile", required=True)
parser.add_argument("--main", default="main.typ")
parser.add_argument("--output", required=True)
args = parser.parse_args()

common = []
for font_path in args.font_path:
    common.extend(["--font-path", font_path])

query_expr = "query(<word-stats>).last().value.raw"
query_cmd = [
    args.typst,
    "eval",
    query_expr,
    "--in",
    args.main,
    *common,
    "--input",
    f"book={args.book}",
    "--input",
    f"template={args.template}",
    "--input",
    f"profile={args.profile}",
    "--format",
    "json",
]
stats = json.loads(run(query_cmd, capture=True))
if not isinstance(stats, dict) or set(stats) < {"words", "chars"}:
    raise SystemExit(f"unexpected word-count metadata: {stats!r}")

words = int(stats["words"])
chars = int(stats["chars"])
if words < 0 or chars < 0:
    raise SystemExit(f"invalid word-count metadata: {stats!r}")

output = Path(args.output)
output.parent.mkdir(parents=True, exist_ok=True)

compile_cmd = [
    args.typst,
    "compile",
    "--no-pdf-tags",
    *common,
    "--input",
    f"book={args.book}",
    "--input",
    f"template={args.template}",
    "--input",
    "review=true",
    "--input",
    f"profile={args.profile}",
    "--input",
    f"raw-words={words}",
    "--input",
    f"raw-chars={chars}",
    args.main,
    str(output),
]
run(compile_cmd)
print(
    f"ok: review {args.book}/{args.template}/{args.profile}: "
    f"raw={words} words/{chars} chars -> {output}"
)
