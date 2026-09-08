"""Tests for materialising a repository's licence from its manifest.

A licence is a legal document, so the tests are mostly about not altering it: substitution stays
inside the placeholders meant for it, and a repository already carrying the right text is left
untouched.
"""

import json
import os

import pytest

import licensing

#: The instructional appendix GPL carries, which must survive untouched.
GPL_APPENDIX = "    Copyright (C) <year>  <name of author>"


def _manifest(root, block):
    """Writes a manifest carrying a licence block.

    Args:
        root: Repository root.
        block: The `license` object.
    """
    os.makedirs(os.path.join(str(root), ".github"), exist_ok=True)
    with open(os.path.join(str(root), ".github", "darkfactory.json"), "w", encoding="utf-8") as h:
        json.dump({"license": block}, h)


def test_a_silent_manifest_declares_no_licence(tmp_path):
    """Absence is not GPL by accident; it is NONE until someone chooses."""
    assert licensing.declared(str(tmp_path))["spdx"] == licensing.NONE


def test_the_declaration_is_read_whole(tmp_path):
    """Holder and year are needed by the licences that name one."""
    _manifest(tmp_path, {"spdx": "MIT", "holder": "A Person", "year": "2026"})
    assert licensing.declared(str(tmp_path)) == {
        "spdx": "MIT",
        "holder": "A Person",
        "year": "2026",
    }


def test_bracketed_placeholders_are_filled(monkeypatch):
    """MIT and BSD name a holder and a year, and expect them substituted."""
    monkeypatch.setattr(
        licensing, "_gh", lambda args: json.dumps({"body": "Copyright (c) [year] [fullname]"})
    )
    assert licensing.body("MIT", "A Person", "2026") == "Copyright (c) 2026 A Person"


def test_the_gpl_appendix_is_left_alone(monkeypatch):
    """It shows a user what to write in their own files; filling it rewrites instructions."""
    monkeypatch.setattr(licensing, "_gh", lambda args: json.dumps({"body": GPL_APPENDIX}))
    assert licensing.body("GPL-3.0", "A Person", "2026") == GPL_APPENDIX


def test_an_unoffered_licence_is_refused(tmp_path, monkeypatch):
    """A licence nobody has thought about should not be reachable by typo."""
    _manifest(tmp_path, {"spdx": "WTFPL"})
    monkeypatch.setattr(licensing, "_gh", lambda args: pytest.fail("must not be fetched"))
    assert licensing.apply(str(tmp_path)) is None
    assert not (tmp_path / "LICENSE").exists()


def test_declaring_none_removes_a_licence_that_contradicts_it(tmp_path):
    """A thesis is deliberately unlicensed; a stray LICENSE would say otherwise."""
    (tmp_path / "LICENSE").write_text("MIT License\n", encoding="utf-8")
    _manifest(tmp_path, {"spdx": licensing.NONE})
    assert licensing.apply(str(tmp_path)) is None
    assert not (tmp_path / "LICENSE").exists()


def test_matching_text_is_not_rewritten(tmp_path, monkeypatch):
    """Rewriting an identical file would put a diff in every run that touches it."""
    monkeypatch.setattr(licensing, "_gh", lambda args: json.dumps({"body": "MIT License"}))
    _manifest(tmp_path, {"spdx": "MIT"})
    target = tmp_path / "LICENSE"
    target.write_text("MIT License\n", encoding="utf-8")
    before = target.stat().st_mtime_ns
    assert licensing.apply(str(tmp_path)) == "MIT"
    assert target.stat().st_mtime_ns == before, "an unchanged licence must not be rewritten"
