"""Tests for the operator-facing command line.

The CLI is a front door rather than a layer: each subcommand must delegate to the module that
already implements the behaviour, so there is one implementation and the two cannot drift.
"""

import json

import pytest

import darkfactory


def test_every_subcommand_is_reachable():
    """A subcommand nobody can invoke is a behaviour nobody has."""
    parser = darkfactory.build_parser()
    actions = [a for a in parser._actions if hasattr(a, "choices") and a.choices]
    names = set(actions[0].choices) if actions else set()
    assert {"describe", "auth", "status", "license", "submodules"} <= names


def test_describe_reads_the_environment_module(tmp_path, capsys):
    """Delegation, not reimplementation: the answer comes from `environment`."""
    (tmp_path / "pyproject.toml").write_text(
        '[project]\nname = "thing"\nversion = "1.0.0"\n', encoding="utf-8"
    )
    assert darkfactory.main(["describe", "--path", str(tmp_path)]) == 0
    out = capsys.readouterr().out
    assert "python" in out and "code" in out


def test_describe_json_is_the_whole_environment(tmp_path, capsys):
    """Anything scripting against this needs the full structure, not the summary."""
    (tmp_path / "pyproject.toml").write_text(
        '[project]\nname = "thing"\nversion = "1.0.0"\n', encoding="utf-8"
    )
    darkfactory.main(["describe", "--path", str(tmp_path), "--json"])
    payload = json.loads(capsys.readouterr().out)
    assert {"domains", "ecosystems", "packages", "test_plan"} <= set(payload)


def test_auth_without_a_repository_is_a_usage_error(tmp_path, monkeypatch, capsys):
    """Guessing which repository to write credentials to would be the wrong kind of helpful.

    `GITHUB_REPOSITORY` has to be cleared explicitly. Inside Actions it is always set, and the
    manifest falls back to it - which is correct there and hid this test's premise entirely, so it
    passed on a developer machine and failed in CI.
    """
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("GITHUB_REPOSITORY", raising=False)
    assert darkfactory.main(["auth"]) == 2
    assert "pass --repo" in capsys.readouterr().err


def test_status_reports_what_is_missing_rather_than_failing(monkeypatch, capsys):
    """The question an operator has is 'why is nothing happening', not 'did a call succeed'."""
    monkeypatch.setattr(darkfactory, "_gh_json", lambda args, default: default)
    monkeypatch.setattr(darkfactory, "_has_path", lambda repo, path: False)
    assert darkfactory.main(["status", "--repo", "o/r"]) == 1
    out = capsys.readouterr().out
    assert "agent credential" in out and "NO" in out


def test_status_is_clean_when_everything_is_configured(monkeypatch, capsys):
    """A fully configured repository must not report a problem it does not have."""

    def fake_json(args, default):
        if args[-1].endswith("secrets"):
            return {"secrets": [{"name": "CLAUDE_CODE_OAUTH_TOKEN"}, {"name": "GH_PROJECT_TOKEN"}]}
        return {"variables": [{"name": "AGENT_ENABLED", "value": "true"}]}

    monkeypatch.setattr(darkfactory, "_gh_json", fake_json)
    monkeypatch.setattr(darkfactory, "_has_path", lambda repo, path: True)
    assert darkfactory.main(["status", "--repo", "o/r"]) == 0
    assert "NO" not in capsys.readouterr().out
