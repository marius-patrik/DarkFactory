"""Tests for installing the declared harnesses into the agent image.

The behaviour that matters is the one `|| true` removed: a harness that fails to install must be
named, and a required one missing must stop the build.
"""

import pytest

import harnesses
import install_harnesses


def test_every_harness_declares_how_it_is_installed():
    """A harness the image cannot install is one the ladder will silently skip."""
    missing = [n for n in harnesses.ORDER if not harnesses.get_harness(n).install]
    assert not missing, f"no installer declared for: {missing}"


def test_a_present_binary_counts_as_installed(monkeypatch):
    """Success is the binary existing afterwards, not the installer's exit status.

    Some installers exit zero having done nothing, which is how four harnesses went missing from a
    green build.
    """
    monkeypatch.setattr(
        install_harnesses.subprocess,
        "run",
        lambda *a, **k: type("R", (), {"stdout": "", "stderr": "", "returncode": 1})(),
    )
    monkeypatch.setattr(install_harnesses.shutil, "which", lambda binary: "/usr/bin/claude")
    ok, _ = install_harnesses.install_one("claude")
    assert ok is True


def test_a_missing_binary_is_a_failure_however_the_installer_exited(monkeypatch):
    """An installer exiting zero without producing a binary is the exact observed fault."""
    monkeypatch.setattr(
        install_harnesses.subprocess,
        "run",
        lambda *a, **k: type(
            "R", (), {"stdout": "", "stderr": "npm error 404 not found", "returncode": 0}
        )(),
    )
    monkeypatch.setattr(install_harnesses.shutil, "which", lambda binary: None)
    ok, detail = install_harnesses.install_one("kimi")
    assert ok is False
    assert "404" in detail, "the reason must be reported, not discarded"


def test_failures_are_collected_rather_than_raised(monkeypatch):
    """One vendor's bad day must not stop the other harnesses installing."""
    monkeypatch.setattr(
        install_harnesses,
        "install_one",
        lambda name: (name != "kimi", "404" if name == "kimi" else ""),
    )
    failures = install_harnesses.install_all(["claude", "kimi", "codex"])
    assert set(failures) == {"kimi"}


def test_claude_is_required_because_it_is_the_fallback():
    """The ladder falls back to it when a metered provider is exhausted."""
    assert "claude" in install_harnesses.REQUIRED


def test_the_required_list_stays_short():
    """Failing the build for every optional harness is how `|| true` came to exist."""
    assert len(install_harnesses.REQUIRED) < len(harnesses.ORDER) / 2
