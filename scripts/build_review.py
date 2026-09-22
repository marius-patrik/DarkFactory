#!/usr/bin/env python3
"""Compile the print-oriented review PDF from the canonical manuscript."""

from __future__ import annotations

import argparse
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
parser.add_argument("--book", default="paper")
parser.add_argument("--template", default="gjkt-odborna-prace")
parser.add_argument("--main", default="paper/PAPER.typ")
parser.add_argument("--output", required=True)
args = parser.parse_args()

if args.book == "DarkFactory" and not Path("DarkFactory").exists() and Path("paper").exists():
    args.book = "paper"
if not Path(args.main).exists() and Path("paper/PAPER.typ").exists():
    args.main = "paper/PAPER.typ"

common = []
for font_path in args.font_path:
    common.extend(["--font-path", font_path])

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
    args.main,
    str(output),
]
run(compile_cmd)
print(
    f"ok: review {args.book}/{args.template}: {output}"
)
