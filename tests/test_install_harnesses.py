"""Tests for installing the declared harnesses into the agent image.

The behaviour that matters is the one `|| true` removed: a harness that fails to install must be
named, and a required one missing must stop the build.
"""

import pytest

import harnesses
import install_harnesses


def test_nothing_in_the_default_chain_needs_a_registry_installer():
    """df arrives through the Dockerfile's Bun steps, not through this script."""
    missing = [
        name
        for name in harnesses.ORDER
        if not harnesses.get_harness(name).install and name not in ("df",)
    ]
    assert not missing, f"no installer declared for: {missing}"


def test_df_counts_as_installed_without_a_registry_installer(monkeypatch):
    """A harness declaring no installer is provided by the image itself.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setattr(
        install_harnesses.subprocess,
        "run",
        lambda *a, **k: pytest.fail("the image provides df; nothing must run"),
    )
    ok, detail = install_harnesses.install_one("df")
    assert ok is True
    assert detail == "provided by the image"


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


def test_nothing_is_required_because_df_comes_from_the_bun_steps():
    """The image installs df itself; nothing installed here may fail the build."""
    assert install_harnesses.REQUIRED == []


def test_the_required_list_stays_short():
    """Failing the build for every optional harness is how `|| true` came to exist."""
    assert len(install_harnesses.REQUIRED) < len(harnesses.ORDER) / 2
