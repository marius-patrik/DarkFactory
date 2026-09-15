#!/usr/bin/env python3
"""docs_impact check script.
Inspects git diff for changes to public surface files and ensures documentation
is updated unless the PR body contains a bypass marker.

Public surface files include:
- harness/src/ (any file)
- .github/workflows/ (any file)
- any *.schema.json file (e.g., Graph or provider schemas)
- .agents/rules/ (any file)

Documentation files (must be touched when public surface changes):
- README.md
- PRD.md
- any file under .agents/notes/
- any file under .agents/rules/

Bypass marker in PR body: a line matching ``Docs: none (<reason>)``.
"""

import argparse
import os
import re
import sys
import subprocess
from typing import List, Set

DOCS_REGEX = re.compile(r"Docs:\s*none\s*\(.*\)", re.IGNORECASE)


def get_changed_files_from_git() -> List[str]:
    # Get list of changed files between HEAD and the merge base with origin/main
    try:
        merge_base = subprocess.check_output(
            ["git", "merge-base", "HEAD", "origin/main"], text=True
        ).strip()
        output = subprocess.check_output(["git", "diff", "--name-only", merge_base], text=True)
    except subprocess.CalledProcessError as e:
        print(f"Error obtaining git diff: {e}", file=sys.stderr)
        return []
    return [line.strip() for line in output.splitlines() if line.strip()]


def load_changed_files(diff_path: str) -> List[str]:
    with open(diff_path, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def is_public_surface(path: str) -> bool:
    # harness src files
    if path.startswith("harness/src/"):
        return True
    # workflow files
    if path.startswith(".github/workflows/"):
        return True
    # schema files
    if path.endswith(".schema.json"):
        return True
    # rules files
    if path.startswith(".agents/rules/"):
        return True
    return False


def is_doc_file(path: str) -> bool:
    if path in {"README.md", "PRD.md"}:
        return True
    if path.startswith(".agents/notes/"):
        return True
    if path.startswith(".agents/rules/"):
        return True
    return False


def has_bypass(pr_body: str) -> bool:
    return bool(DOCS_REGEX.search(pr_body))


def main() -> int:
    parser = argparse.ArgumentParser(description="Check docs impact")
    parser.add_argument(
        "--diff", help="Path to a file containing list of changed files (one per line)"
    )
    parser.add_argument("--pr-body", help="PR body text for bypass detection", default="")
    args = parser.parse_args()

    if args.diff:
        changed = load_changed_files(args.diff)
    else:
        changed = get_changed_files_from_git()

    if not changed:
        return 0

    public_changes: Set[str] = {p for p in changed if is_public_surface(p)}
    if not public_changes:
        # No public surface changes => no docs requirement
        return 0

    doc_changes: Set[str] = {p for p in changed if is_doc_file(p)}
    if doc_changes:
        return 0

    if has_bypass(args.pr_body):
        return 0

    print("Public surface changes detected without documentation updates:")
    for p in sorted(public_changes):
        print(f"  - {p}")
    print(
        "Please update README.md, PRD.md, or related .agents notes/rules, or add a Docs: none(<reason>) bypass."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
