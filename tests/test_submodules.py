"""Tests for keeping a super-repository's submodules pinned and current.

The behaviour that matters is idempotence: a scheduled run on an unchanged repository must produce
no commit, and pinning something already pinned must change nothing.
"""

import os
import subprocess

import pytest

import submodules


def _write_gitmodules(root, body):
    """Writes a `.gitmodules` file.

    Args:
        root: Repository root.
        body: File contents.
    """
    with open(os.path.join(str(root), ".gitmodules"), "w", encoding="utf-8") as handle:
        handle.write(body)


def test_a_repository_without_submodules_reads_as_empty(tmp_path):
    """Most repositories have none, and that must not be an error."""
    assert submodules.read_submodules(str(tmp_path)) == []


def test_every_declared_submodule_is_read(tmp_path):
    """Path, url and the branch pin all come from `.gitmodules`."""
    _write_gitmodules(
        tmp_path,
        '[submodule "prace"]\n'
        "\tpath = prace\n"
        "\turl = https://github.com/o/prace.git\n"
        "\tbranch = main\n"
        '[submodule "engine"]\n'
        "\tpath = engine\n"
        "\turl = https://github.com/o/engine.git\n",
    )
    found = submodules.read_submodules(str(tmp_path))
    assert [m.path for m in found] == ["prace", "engine"]
    assert found[0].branch == "main"
    assert found[1].branch is None, "an unpinned submodule reports no branch"


def test_a_section_missing_its_path_is_ignored(tmp_path):
    """A malformed section must not crash the run that is meant to keep things current."""
    _write_gitmodules(tmp_path, '[submodule "broken"]\n\turl = https://github.com/o/x.git\n')
    assert submodules.read_submodules(str(tmp_path)) == []


def test_pinning_skips_what_is_already_pinned(tmp_path, monkeypatch):
    """Idempotence: a submodule that names its branch is left alone."""
    _write_gitmodules(
        tmp_path,
        '[submodule "prace"]\n\tpath = prace\n\turl = https://github.com/o/p.git\n\tbranch = main\n',
    )
    monkeypatch.setattr(
        submodules, "default_branch", lambda url: pytest.fail("must not consult the remote")
    )
    assert submodules.pin_branches(str(tmp_path)) == []


def test_an_unreadable_remote_does_not_stop_the_others(tmp_path, monkeypatch):
    """One unreachable remote must not prevent the rest being pinned."""
    _write_gitmodules(
        tmp_path,
        '[submodule "a"]\n\tpath = a\n\turl = https://github.com/o/a.git\n'
        '[submodule "b"]\n\tpath = b\n\turl = https://github.com/o/b.git\n',
    )
    monkeypatch.setattr(
        submodules, "default_branch", lambda url: None if "a.git" in url else "main"
    )
    monkeypatch.setattr(submodules, "_git", lambda args, root=".": "")
    assert submodules.pin_branches(str(tmp_path)) == ["b"]


def test_nothing_moving_is_said_plainly():
    """A quiet scheduled run should read as quiet, not as an empty table."""
    assert "No submodule moved" in submodules.describe([])


def test_movements_are_rendered_as_a_table():
    """The report becomes a commit body, so it has to be readable."""
    moved = [submodules.Movement(path="prace", branch="main", before="aaaaaaaa", after="bbbbbbbb")]
    rendered = submodules.describe(moved)
    assert "| `prace` | `main` | `aaaaaaaa` | `bbbbbbbb` |" in rendered
