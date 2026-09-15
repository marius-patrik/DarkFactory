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
- harness/README.md
- PRD.md
- any file under docs/
- any file under .agents/notes/
- any file under .agents/rules/

Bypass marker in PR body: a line matching ``Docs: none (<reason>)`` where <reason> is non-empty.
"""

import argparse
import os
import re
import subprocess
import sys
from typing import List, Optional, Set

DOCS_REGEX = re.compile(r"Docs:\s*none\s*\((.+?)\)", re.IGNORECASE)


def get_merge_base(base: str, head: str = "HEAD") -> str:
    """Return the merge base of base and head.

    Args:
        base: Reference to merge against.
        head: Head reference (default HEAD).

    Returns:
        The merge base commit SHA.

    Raises:
        subprocess.CalledProcessError: If git fails.
    """
    return subprocess.check_output(["git", "merge-base", base, head], text=True).strip()


def get_changed_files(base: str, diff_path: Optional[str] = None) -> List[str]:
    """Return the list of changed files between base and HEAD.

    Args:
        base: Merge base reference.
        diff_path: If given, read files from this path instead of git.

    Returns:
        List of changed file paths.

    Raises:
        subprocess.CalledProcessError: If git fails.
    """
    if diff_path:
        with open(diff_path, "r", encoding="utf-8") as f:
            return [line.strip() for line in f if line.strip()]
    merge_base = get_merge_base(base, "HEAD")
    output = subprocess.check_output(
        ["git", "diff", "--name-only", f"{merge_base}...HEAD"], text=True
    )
    return [line.strip() for line in output.splitlines() if line.strip()]


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
    if path in {"README.md", "PRD.md", "harness/README.md"}:
        return True
    if path.startswith("docs/"):
        return True
    if path.startswith(".agents/notes/"):
        return True
    if path.startswith(".agents/rules/"):
        return True
    return False


def has_bypass(pr_body: str) -> bool:
    m = DOCS_REGEX.search(pr_body)
    return bool(m and m.group(1).strip())


def main() -> int:
    parser = argparse.ArgumentParser(description="Check docs impact")
    parser.add_argument(
        "--diff", help="Path to a file containing list of changed files (one per line)"
    )
    parser.add_argument(
        "--base",
        default=os.environ.get("DOCS_IMPACT_BASE", ""),
        help="Base ref or SHA for merge-base (default: DOCS_IMPACT_BASE env)",
    )
    parser.add_argument(
        "--body-file",
        help="Path to file containing PR body text",
    )
    parser.add_argument("--pr-body", help="PR body text for bypass detection", default="")
    args = parser.parse_args()

    # Read PR body: --body-file > env PR_BODY > --pr-body
    pr_body = args.pr_body
    if args.body_file:
        with open(args.body_file, "r", encoding="utf-8") as f:
            pr_body = f.read()
    elif not pr_body:
        pr_body = os.environ.get("PR_BODY", "")

    if args.diff:
        changed = get_changed_files(args.base, diff_path=args.diff)
    else:
        if not args.base:
            print(
                "No --base given and DOCS_IMPACT_BASE env is unset; cannot compute diff",
                file=sys.stderr,
            )
            return 2
        try:
            changed = get_changed_files(args.base)
        except subprocess.CalledProcessError as e:
            print(f"Git command failed: {e}", file=sys.stderr)
            return 2

    if not changed:
        return 0

    public_changes: Set[str] = {p for p in changed if is_public_surface(p)}
    if not public_changes:
        return 0

    doc_changes: Set[str] = {p for p in changed if is_doc_file(p)}
    if doc_changes:
        return 0

    if has_bypass(pr_body):
        return 0

    print("Public surface changes detected without documentation updates:")
    for p in sorted(public_changes):
        print(f"  - {p}")
    print(
        "Please update README.md, harness/README.md, docs/, PRD.md, or related .agents notes/rules, or add a Docs: none(<reason>) bypass."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
