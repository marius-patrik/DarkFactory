"""Keeps a super-repository's submodules pinned to a branch and current with it.

A super-repository records each submodule at one commit, and nothing moves that commit on its own.
Left alone the pointers drift behind by weeks, and the difference only shows up when someone clones
with `--recurse-submodules` and gets a version of the work nobody has looked at for a month.

Two things are needed rather than one. A submodule must say *which branch* it follows - `git
submodule update --remote` consults `submodule.<name>.branch` and silently falls back to the
default branch when it is missing, so the pin is worth writing down - and it must then be moved to
the tip of that branch.

Both are idempotent: pinning a submodule that is already pinned changes nothing, and updating one
already at the tip reports no movement, so a scheduled run on an unchanged repository produces no
commit.
"""

import os
import re
import subprocess
import sys
from typing import Dict, List, NamedTuple, Optional


class Submodule(NamedTuple):
    """One submodule as declared in `.gitmodules`.

    Attributes:
        name: Section name, which is the path unless it was renamed.
        path: Working-tree path.
        url: Remote the submodule is cloned from.
        branch: Branch it follows, or `None` when none is pinned.
    """

    name: str
    path: str
    url: str
    branch: Optional[str]


class Movement(NamedTuple):
    """A submodule pointer that moved.

    Attributes:
        path: Working-tree path.
        branch: Branch that was followed.
        before: Commit recorded before the update.
        after: Commit recorded after it.
    """

    path: str
    branch: str
    before: str
    after: str


def _git(args: List[str], root: str = ".") -> str:
    """Runs git and returns stripped stdout.

    Args:
        args: Arguments following the git executable.
        root: Repository root.

    Returns:
        Command stdout with surrounding whitespace removed.

    Raises:
        subprocess.CalledProcessError: When git fails.
    """
    return subprocess.run(
        ["git", "-C", root, *args], capture_output=True, text=True, check=True
    ).stdout.strip()


def read_submodules(root: str = ".") -> List[Submodule]:
    """Reads the submodules declared in `.gitmodules`.

    Args:
        root: Repository root.

    Returns:
        Declared submodules, in file order. Empty when the repository has none.
    """
    path = os.path.join(root, ".gitmodules")
    if not os.path.isfile(path):
        return []

    sections: Dict[str, Dict[str, str]] = {}
    current: Optional[str] = None
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            header = re.match(r'\s*\[submodule "(?P<name>.+)"\]', line)
            if header:
                current = header.group("name")
                sections.setdefault(current, {})
                continue
            entry = re.match(r"\s*(?P<key>\w+)\s*=\s*(?P<value>.+?)\s*$", line)
            if entry and current:
                sections[current][entry.group("key")] = entry.group("value")

    found: List[Submodule] = []
    for name, values in sections.items():
        if "path" not in values or "url" not in values:
            continue
        found.append(
            Submodule(
                name=name,
                path=values["path"],
                url=values["url"],
                branch=values.get("branch"),
            )
        )
    return found


def default_branch(url: str) -> Optional[str]:
    """Asks the remote which branch it considers default.

    Args:
        url: Remote url.

    Returns:
        The branch name, or `None` when the remote could not be read.
    """
    try:
        output = subprocess.run(
            ["git", "ls-remote", "--symref", url, "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
    except subprocess.CalledProcessError:
        return None
    match = re.search(r"^ref:\s+refs/heads/(?P<branch>\S+)\s+HEAD", output, re.M)
    return match.group("branch") if match else None


def pin_branches(root: str = ".") -> List[str]:
    """Writes a branch pin for every submodule that lacks one.

    Args:
        root: Repository root.

    Returns:
        Paths of the submodules that were newly pinned.
    """
    pinned: List[str] = []
    for module in read_submodules(root):
        if module.branch:
            continue
        branch = default_branch(module.url)
        if not branch:
            print(f"Could not read the default branch of {module.url}", file=sys.stderr)
            continue
        _git(["config", "-f", ".gitmodules", f"submodule.{module.name}.branch", branch], root)
        print(f"Pinned {module.path} to {branch}")
        pinned.append(module.path)
    return pinned


def _recorded_commit(root: str, path: str) -> str:
    """Returns the commit the super-repository records for a submodule.

    Args:
        root: Repository root.
        path: Submodule path.

    Returns:
        The commit sha, or an empty string when it cannot be read.
    """
    try:
        return _git(["ls-tree", "HEAD", path], root).split()[2]
    except (subprocess.CalledProcessError, IndexError):
        return ""


def update(root: str = ".") -> List[Movement]:
    """Moves every submodule to the tip of the branch it follows.

    Args:
        root: Repository root.

    Returns:
        The submodules whose recorded commit changed.
    """
    modules = read_submodules(root)
    if not modules:
        return []

    before = {m.path: _recorded_commit(root, m.path) for m in modules}
    _git(["submodule", "update", "--init", "--remote", "--recursive"], root)

    moved: List[Movement] = []
    for module in read_submodules(root):
        after = _git(["rev-parse", "HEAD"], os.path.join(root, module.path))
        if after != before.get(module.path):
            moved.append(
                Movement(
                    path=module.path,
                    branch=module.branch or "(default)",
                    before=before.get(module.path, "")[:8],
                    after=after[:8],
                )
            )
    return moved


def describe(moved: List[Movement]) -> str:
    """Renders the movements as a markdown table for a commit or pull request body.

    Args:
        moved: Movements to describe.

    Returns:
        Markdown, or a sentence saying nothing moved.
    """
    if not moved:
        return "No submodule moved; every pointer already matched its branch."
    lines = ["| Submodule | Branch | From | To |", "| :--- | :--- | :--- | :--- |"]
    lines += [f"| `{m.path}` | `{m.branch}` | `{m.before}` | `{m.after}` |" for m in moved]
    return "\n".join(lines)


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Entry point: pins any unpinned submodule, then updates them all."""
    root = os.environ.get("GITHUB_WORKSPACE", ".")
    pin_branches(root)
    moved = update(root)
    print(describe(moved))
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write(f"moved={'true' if moved else 'false'}\n")


if __name__ == "__main__":
    main()
