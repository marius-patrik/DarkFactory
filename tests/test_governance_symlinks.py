"""Tests supported discovery aliases without turning generated projections into authorities.

Canonical governance lives in `.agents/rules/**` and current long-term notes live in
`.agents/notes/**`. Root `AGENTS.md` and `README.md` are generated projections. Conventional/tool
entry points may point at those projections or canonical directories, but unsupported legacy aliases
must not be preserved.

Checking the working tree is not enough. Git stores a symlink as mode `120000` and a regular file
as `100644`; when the mode is wrong the checkout is a small text file whose *content* is the target
path. `CLAUDE.md` then reads as the nine characters `AGENTS.md` and the governance layer silently
disappears - which is precisely how this repository shipped. A working-tree check tolerant of
platforms without symlink support cannot tell that apart from a legitimate Windows checkout, so
these tests assert the committed index mode instead, which is platform-independent.
"""

import os
import subprocess
from typing import Dict

import pytest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

#: Governance alias -> the relative target it must point at.
EXPECTED_LINKS: Dict[str, str] = {
    "CONTRIBUTING.md": "AGENTS.md",
    ".claude": ".agents",
    ".agents/AGENTS.md": "../AGENTS.md",
    ".agents/CLAUDE.md": "../AGENTS.md",
    ".agents/README.md": "../README.md",
    ".agents/notes/README.md": "../../README.md",
}

#: Git's file mode for a symbolic link.
SYMLINK_MODE = "120000"


def _index_modes() -> Dict[str, str]:
    """Reads the file mode git has recorded for every tracked path.

    Returns:
        Mapping of repository-relative path to its six-digit git mode.

    Raises:
        pytest.skip.Exception: If git is unavailable or this is not a work tree.
    """
    try:
        result = subprocess.run(
            ["git", "ls-files", "-s"],
            cwd=REPO_ROOT,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):  # pragma: no cover - environment guard
        pytest.skip("git is not available, so the committed modes cannot be inspected")

    modes: Dict[str, str] = {}
    for line in result.stdout.splitlines():
        meta, _, path = line.partition("\t")
        if path:
            modes[path] = meta.split()[0]
    return modes


@pytest.mark.parametrize("alias", sorted(EXPECTED_LINKS))
def test_alias_is_committed_as_a_symlink(alias: str):
    """A governance alias committed as a regular file hides the rules behind a path string."""
    modes = _index_modes()
    assert alias in modes, f"{alias} is not tracked by git"
    assert modes[alias] == SYMLINK_MODE, (
        f"{alias} is committed as mode {modes[alias]}, not {SYMLINK_MODE}. It is a text file "
        f"containing the string {EXPECTED_LINKS[alias]!r} rather than a link to it, so anything "
        "reading it gets that string instead of the governance rules."
    )


@pytest.mark.parametrize("alias, target", sorted(EXPECTED_LINKS.items()))
def test_alias_points_at_the_canonical_document(alias: str, target: str):
    """The link target is relative, so the tree stays valid wherever it is checked out."""
    path = os.path.join(REPO_ROOT, alias)
    if not os.path.islink(path):  # pragma: no cover - platforms without symlink support
        pytest.skip(f"{alias} is not a symlink in this working tree")
    assert os.readlink(path) == target, f"{alias} must point at {target}"
    assert not os.path.isabs(os.readlink(path)), f"{alias} must use a relative target"


def test_generated_projections_are_real_root_files():
    """Generated root projections are files while canonical rule/note directories remain separate."""
    modes = _index_modes()
    assert modes.get("AGENTS.md") == "100644", "AGENTS.md must be the real file, not a link"
    assert os.path.getsize(os.path.join(REPO_ROOT, "AGENTS.md")) > 1000
    assert modes.get("README.md") == "100644", "README.md must be the generated notes projection"
    assert os.path.isdir(os.path.join(REPO_ROOT, ".agents", "rules"))
    assert os.path.isdir(os.path.join(REPO_ROOT, ".agents", "notes"))


def test_claude_entry_is_a_regular_import():
    """Claude Code discovers a root import; a symlink would need Windows developer mode."""
    modes = _index_modes()
    assert modes.get("CLAUDE.md") == "100644", "CLAUDE.md must be a regular file, not a link"
    with open(os.path.join(REPO_ROOT, "CLAUDE.md"), encoding="utf-8") as handle:
        assert (
            handle.read().strip() == "@AGENTS.md"
        ), "CLAUDE.md must import the AGENTS.md projection"


def test_every_alias_resolves_to_readable_content():
    """A link that resolves to nothing is as broken as one committed as text."""
    for alias in EXPECTED_LINKS:
        path = os.path.join(REPO_ROOT, alias)
        assert os.path.exists(path), f"{alias} does not resolve"
        if os.path.isdir(path):
            assert os.listdir(path), f"{alias} resolves to an empty directory"
            continue
        if not os.path.islink(path):
            # A `core.symlinks=false` checkout materializes each symlink as a one-line text file
            # whose content is the target path. There is nothing meaningful to read there; the
            # index-mode tests already pin down what those aliases must be.
            pytest.skip(f"{alias} is not a symlink in this working tree")
        with open(path, encoding="utf-8") as handle:
            assert len(handle.read()) > 100, f"{alias} resolves to a stub"
