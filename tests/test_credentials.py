"""Tests for collecting harness credentials from the machine running the pipeline.

The behaviour worth pinning is where a credential is read from, and that a value never passes
through this process's output on its way to a secret.
"""

import json
import subprocess

import pytest

import credentials


def test_the_environment_wins_over_the_keychain(monkeypatch):
    """An operator who exported something meant it."""
    source = credentials.Source(
        secret="X", describe="x", env="X_TOKEN", keychain="svc", json_path="a.b"
    )
    monkeypatch.setenv("X_TOKEN", "from-env")
    monkeypatch.setattr(credentials.subprocess, "run", lambda *a, **k: pytest.fail("no keychain"))
    assert credentials.read(source) == "from-env"


def test_a_json_keychain_entry_is_dug_into(monkeypatch):
    """Some CLIs store a whole token document, not a bare string."""
    source = credentials.Source(secret="X", describe="x", keychain="svc", json_path="token.refresh")
    monkeypatch.setattr(credentials.sys, "platform", "darwin")
    monkeypatch.setattr(credentials.shutil, "which", lambda name: "/usr/bin/security")
    monkeypatch.setattr(
        credentials.subprocess,
        "run",
        lambda *a, **k: type("R", (), {"stdout": json.dumps({"token": {"refresh": "deep"}})})(),
    )
    assert credentials.read(source) == "deep"


def test_a_missing_credential_is_not_an_error(monkeypatch):
    """A machine with three of five credentials should set three, not fail."""
    source = credentials.Source(secret="X", describe="x", env="ABSENT_TOKEN")
    monkeypatch.delenv("ABSENT_TOKEN", raising=False)
    assert credentials.read(source) is None


def test_claude_is_not_read_from_the_keychain():
    """The keychain entry is a short-lived access token, refreshed every few hours.

    Copying it produces a secret that works briefly and then fails in a way that looks like a
    broken harness rather than an expired credential, so only the long-lived token is accepted.
    """
    claude = next(s for s in credentials.SOURCES if s.secret == "CLAUDE_CODE_OAUTH_TOKEN")
    assert claude.keychain == "", "the short-lived token must not be collected"
    assert "setup-token" in claude.advice


def test_the_value_is_piped_rather_than_passed_as_an_argument(monkeypatch):
    """A secret in argv is visible to any process listing, and lands in shell history."""
    seen = {}

    def fake_run(cmd, **kwargs):
        seen["cmd"] = cmd
        seen["input"] = kwargs.get("input")
        return type("R", (), {"stdout": "", "stderr": ""})()

    monkeypatch.setattr(credentials.subprocess, "run", fake_run)
    assert credentials.set_secret("o/r", "NAME", "s3cret") is True
    assert "s3cret" not in " ".join(seen["cmd"]), "the value must not appear in argv"
    assert seen["input"] == "s3cret"


def test_a_failed_set_is_reported_not_swallowed(monkeypatch):
    """A secret that silently failed to set is a repository that looks configured."""

    def fake_run(cmd, **kwargs):
        raise subprocess.CalledProcessError(1, cmd, stderr="denied")

    monkeypatch.setattr(credentials.subprocess, "run", fake_run)
    assert credentials.set_secret("o/r", "NAME", "v") is False


def test_a_json_file_is_dug_into(tmp_path):
    """Token files stored on disk as JSON can be queried via json_path."""
    token_file = tmp_path / "token.json"
    token_file.write_text(json.dumps({"token": {"refresh_token": "disk-secret"}}))
    source = credentials.Source(
        secret="X", describe="x", file=str(token_file), json_path="token.refresh_token"
    )
    assert credentials.read(source) == "disk-secret"


def test_a_go_keyring_base64_entry_is_decoded(monkeypatch):
    """go-keyring stores base64-encoded JSON payloads."""
    import base64

    payload = json.dumps({"token": {"refresh_token": "keyring-secret"}})
    encoded = "go-keyring-base64:" + base64.b64encode(payload.encode("utf-8")).decode("utf-8")
    source = credentials.Source(
        secret="X",
        describe="x",
        keychain="gemini",
        keychain_account="antigravity",
        json_path="token.refresh_token",
    )
    monkeypatch.setattr(credentials.sys, "platform", "darwin")
    monkeypatch.setattr(credentials.shutil, "which", lambda name: "/usr/bin/security")
    monkeypatch.setattr(
        credentials.subprocess,
        "run",
        lambda *a, **k: type("R", (), {"stdout": encoded})(),
    )
    assert credentials.read(source) == "keyring-secret"
