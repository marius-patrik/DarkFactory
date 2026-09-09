"""Materialises a repository's licence from what its manifest declares.

A licence is configuration, not content. It is chosen once, it is the same text every project with
that choice uses, and getting it wrong is a legal question rather than a stylistic one - so it
belongs in the manifest beside the other declarations, and the file belongs to the pipeline rather
than to whoever pasted it in first.

Three repositories in this family carried GPL-3.0 and three carried nothing at all, which is the
usual outcome of a licence being a file somebody remembers to add.

The text comes from GitHub's licence API rather than being bundled: a bundled copy is a fork of a
legal document that quietly drifts from the canonical wording.
"""

import json
import os
import subprocess
import sys
from typing import Dict, List, Optional

#: Licences offered to a repository, as SPDX identifiers.
#:
#: Deliberately a short list rather than everything SPDX knows. A licence nobody in this family
#: uses is a licence nobody has thought about, and offering it invites picking one by accident.
OFFERED: List[str] = [
    "GPL-3.0",
    "AGPL-3.0",
    "LGPL-2.1",
    "Apache-2.0",
    "MIT",
    "BSD-3-Clause",
    "MPL-2.0",
    "CC0-1.0",
    "Unlicense",
]

#: Declared when a repository is deliberately not licensed for reuse.
#:
#: A thesis is the case in point: its author holds the copyright and does not want the text reused,
#: which is a different thing from having forgotten to choose.
NONE = "NONE"


def _gh(args: List[str]) -> str:
    """Runs a ``gh`` command and returns stripped stdout.

    Args:
        args: Arguments following the ``gh`` executable.

    Returns:
        Command stdout.

    Raises:
        subprocess.CalledProcessError: When the command fails.
    """
    return subprocess.run(["gh", *args], capture_output=True, text=True, check=True).stdout.strip()


def declared(root: str = ".") -> Dict[str, object]:
    """Reads the licence block from the repository manifest.

    Args:
        root: Repository root.

    Returns:
        Mapping with `spdx`, `holder` and `year`, defaulted where the manifest is silent.
    """
    path = os.path.join(root, ".github", "darkfactory.json")
    block: Dict[str, object] = {}
    if os.path.isfile(path):
        try:
            with open(path, encoding="utf-8") as handle:
                block = json.load(handle).get("license", {}) or {}
        except (OSError, json.JSONDecodeError) as exc:
            print(f"Could not read the licence declaration: {exc}", file=sys.stderr)
    return {
        "spdx": str(block.get("spdx", NONE)),
        "holder": str(block.get("holder", "")),
        "year": str(block.get("year", "")),
    }


def body(spdx: str, holder: str = "", year: str = "") -> Optional[str]:
    """Fetches the canonical licence text and fills in its placeholders.

    Args:
        spdx: SPDX identifier.
        holder: Copyright holder, for licences that name one.
        year: Copyright year, likewise.

    Returns:
        The licence text, or `None` when the identifier is not one GitHub knows.
    """
    try:
        text = json.loads(_gh(["api", f"licenses/{spdx.lower()}"]))["body"]
    except (subprocess.CalledProcessError, KeyError, json.JSONDecodeError) as exc:
        print(f"Could not fetch the text of {spdx}: {exc}", file=sys.stderr)
        return None
    # Only the bracketed placeholders are substituted. GPL and AGPL carry an appendix showing a
    # user what to put in their *own* source files, written with angle brackets; filling those in
    # rewrites instructions as though they were a copyright notice, which is why GitHub leaves
    # them alone too.
    if holder:
        text = text.replace("[fullname]", holder)
    if year:
        text = text.replace("[year]", year)
    return text


def apply(root: str = ".") -> Optional[str]:
    """Writes the declared licence into the repository.

    Args:
        root: Repository root.

    Returns:
        The SPDX identifier written, or `None` when nothing was written.
    """
    block = declared(root)
    spdx = str(block["spdx"])
    target = os.path.join(root, "LICENSE")

    if spdx == NONE:
        # Deliberately unlicensed is a choice, so an existing LICENSE is removed rather than left
        # contradicting the declaration.
        if os.path.isfile(target):
            os.remove(target)
            print("Removed LICENSE: the manifest declares no licence.")
        else:
            print("No licence declared, and none present.")
        return None

    if spdx not in OFFERED:
        print(f"{spdx} is not one of the offered licences: {', '.join(OFFERED)}", file=sys.stderr)
        return None

    text = body(spdx, str(block["holder"]), str(block["year"]))
    if text is None:
        return None

    existing = ""
    if os.path.isfile(target):
        with open(target, encoding="utf-8") as handle:
            existing = handle.read()
    if existing.strip() == text.strip():
        print(f"LICENSE already matches the declared {spdx}.")
        return spdx

    with open(target, "w", encoding="utf-8") as handle:
        handle.write(text if text.endswith("\n") else text + "\n")
    print(f"Wrote LICENSE for {spdx}.")
    return spdx


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Entry point: applies the declared licence to the checked-out repository."""
    written = apply(os.environ.get("TARGET_ROOT", "."))
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write(f"spdx={written or ''}\n")


if __name__ == "__main__":
    main()
