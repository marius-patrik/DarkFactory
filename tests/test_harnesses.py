"""Unit tests for the harness registry."""

import json
import os
from typing import List

import pytest

import harnesses
from harnesses import MODEL, PROMPT, TIMEOUT, Harness, REGISTRY, configured_order, get_harness

EXPECTED_HARNESSES = [
    "antigravity",
    "claude",
    "codex",
    "kimi",
    "grok",
    "cursor",
    "opencode",
]


@pytest.fixture(autouse=True)
def _clear_env(monkeypatch: pytest.MonkeyPatch):
    """Removes harness environment overrides so tests see the built-in registry.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    for key in ("AGENT_HARNESS_CHAIN", "AGENT_HARNESS_CONFIG", "AGENT_MODEL_CHAIN"):
        monkeypatch.delenv(key, raising=False)


@pytest.mark.parametrize("name", EXPECTED_HARNESSES)
def test_every_requested_harness_is_registered(name: str):
    """Each CLI the pipeline promises to drive has a registry entry.

    Args:
        name: Harness registry key.
    """
    assert name in REGISTRY, f"{name} must be registered"
    assert REGISTRY[name].binary, f"{name} must declare a binary"


def test_default_order_covers_the_whole_registry():
    """A registered harness missing from the order would never be tried."""
    assert set(harnesses.ORDER) == set(REGISTRY)


def test_every_template_carries_the_prompt():
    """A template without the prompt placeholder would run the CLI with no instruction."""
    for name, harness in REGISTRY.items():
        assert any(PROMPT in token for token in harness.template), f"{name} drops the prompt"


def test_build_argv_substitutes_prompt_and_model():
    """Placeholders are replaced, and the binary leads the argv."""
    argv = REGISTRY["claude"].build_argv("do the thing", "opus", "5m0s")
    assert argv[0] == "claude"
    assert "do the thing" in argv
    assert "opus" in argv
    assert PROMPT not in argv and MODEL not in argv


def test_build_argv_drops_the_model_flag_when_no_model_is_given():
    """An optional model must not leave a dangling `--model` with no value."""
    argv = REGISTRY["codex"].build_argv("prompt text", None, "5m0s")
    assert "--model" not in argv
    assert MODEL not in " ".join(argv)
    assert argv[0] == "codex" and argv[1] == "exec"


def test_build_argv_substitutes_timeout():
    """The Antigravity template threads the print timeout through."""
    argv = REGISTRY["antigravity"].build_argv("p", "gemini-3.8-flash-high", "15m0s")
    assert "15m0s" in argv
    assert TIMEOUT not in " ".join(argv)


def test_prompt_is_never_shell_interpolated():
    """argv is a list, so a prompt containing shell metacharacters stays one argument."""
    nasty = 'rm -rf / ; echo "$(whoami)" `id` && :'
    argv = REGISTRY["kimi"].build_argv(nasty, None, "5m0s")
    assert nasty in argv, "the prompt must survive as exactly one argv element"


def test_configured_order_respects_the_environment(monkeypatch: pytest.MonkeyPatch):
    """`AGENT_HARNESS_CHAIN` overrides the default order.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv("AGENT_HARNESS_CHAIN", "claude, codex ,grok")
    assert configured_order() == ["claude", "codex", "grok"]


def test_overrides_replace_registry_fields(monkeypatch: pytest.MonkeyPatch):
    """A flag rename is a configuration change, never a code change.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv(
        "AGENT_HARNESS_CONFIG",
        json.dumps({"grok": {"binary": "grok-cli", "model_chain": ["grok-4"]}}),
    )
    harness = get_harness("grok")
    assert harness is not None
    assert harness.binary == "grok-cli"
    assert list(harness.model_chain) == ["grok-4"]
    # The built-in registry is untouched.
    assert REGISTRY["grok"].binary == "grok"


def test_overrides_can_define_a_new_harness(monkeypatch: pytest.MonkeyPatch):
    """A harness the code has never heard of can be added from configuration.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv(
        "AGENT_HARNESS_CONFIG",
        json.dumps({"mystery": {"binary": "mystery-cli", "template": ["-p", PROMPT]}}),
    )
    harness = get_harness("mystery")
    assert harness is not None
    assert harness.build_argv("hi", None, "5m0s") == ["mystery-cli", "-p", "hi"]
    assert "mystery" in configured_order()


def test_malformed_override_is_ignored(monkeypatch: pytest.MonkeyPatch):
    """Bad JSON must not take the pipeline down.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv("AGENT_HARNESS_CONFIG", "{not json")
    assert get_harness("claude") is not None
    assert configured_order() == harnesses.ORDER


def test_unavailable_harnesses_are_skipped(monkeypatch: pytest.MonkeyPatch):
    """Absent binaries are skipped, not failed, so a partial image still works.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setattr(harnesses.shutil, "which", lambda binary: None)
    assert harnesses.resolve_attempts() == []


def test_resolve_attempts_flattens_harnesses_and_models(monkeypatch: pytest.MonkeyPatch):
    """Every harness contributes one attempt per model, in order.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv("AGENT_HARNESS_CHAIN", "antigravity,codex")
    monkeypatch.setenv("ANTIGRAVITY_REFRESH_TOKEN", "x")
    monkeypatch.setenv("OPENAI_API_KEY", "y")
    monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")

    attempts = harnesses.resolve_attempts()
    assert [(h.name, m) for h, m in attempts] == [
        ("antigravity", "gemini-3.8-flash-high"),
        ("antigravity", "claude-opus-4-6-thinking"),
        ("codex", None),
    ]


def test_unauthenticated_harnesses_are_skipped(monkeypatch: pytest.MonkeyPatch):
    """A harness with no credentials is skipped before it can fail mid-run.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv("AGENT_HARNESS_CHAIN", "claude")
    monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
    for key in ("ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"):
        monkeypatch.delenv(key, raising=False)
    assert harnesses.resolve_attempts() == []

    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-test")
    attempts = harnesses.resolve_attempts()
    assert {h.name for h, _m in attempts} == {"claude"}
    assert [m for _h, m in attempts] == list(REGISTRY["claude"].model_chain)


def test_model_chain_override_applies_to_the_first_harness(monkeypatch: pytest.MonkeyPatch):
    """A caller can pin models without knowing which harness will run.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv("AGENT_HARNESS_CHAIN", "claude,codex")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "x")
    monkeypatch.setenv("OPENAI_API_KEY", "y")
    monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")

    attempts = harnesses.resolve_attempts(model_chain=["pinned-a", "pinned-b"])
    assert [(h.name, m) for h, m in attempts][:2] == [
        ("claude", "pinned-a"),
        ("claude", "pinned-b"),
    ]


def test_describe_chain_reports_emptiness_honestly(monkeypatch: pytest.MonkeyPatch):
    """The quota notice must not imply a chain exists when none does.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setattr(harnesses.shutil, "which", lambda binary: None)
    assert "No harness is available" in harnesses.describe_chain()


#: What each harness's `env_keys` named before credentials moved into the `auth` declaration.
#: The refactor must not change which variables authenticate a harness, and this is what says so.
CREDENTIALS_BEFORE = {
    "antigravity": {"ANTIGRAVITY_REFRESH_TOKEN"},
    "claude": {"ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"},
    "codex": {"OPENAI_API_KEY"},
    "kimi": {"MOONSHOT_API_KEY", "KIMI_API_KEY"},
    "grok": {"XAI_API_KEY", "GROK_API_KEY"},
    "cursor": {"CURSOR_API_KEY"},
    "opencode": {"OPENCODE_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"},
}


@pytest.mark.parametrize("name", EXPECTED_HARNESSES)
def test_every_harness_declares_its_credentials(name: str):
    """Auth is uniform: no harness is left to find its key by luck.

    Args:
        name: Registry key.
    """
    harness = REGISTRY[name]
    assert harness.auth is not None, f"{name} declares no auth"
    assert harness.auth.env_names(), f"{name} declares an auth naming no variable"


@pytest.mark.parametrize("name", EXPECTED_HARNESSES)
def test_declared_credentials_match_what_env_keys_named(name: str):
    """Moving credentials into the declaration changed no harness's answer.

    Args:
        name: Registry key.
    """
    assert set(REGISTRY[name].credentials) == CREDENTIALS_BEFORE[name]


def test_the_registry_names_credentials_in_one_place():
    """`env_keys` is the override hook, so the registry itself must not use it."""
    assert all(not harness.env_keys for harness in REGISTRY.values())


def test_an_alternative_name_authenticates_on_its_own(monkeypatch: pytest.MonkeyPatch):
    """Kimi's second accepted variable is as good as its first.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.delenv("MOONSHOT_API_KEY", raising=False)
    monkeypatch.setenv("KIMI_API_KEY", "sk-test")
    assert REGISTRY["kimi"].is_authenticated()
    assert REGISTRY["kimi"].auth.is_satisfied()


def test_env_keys_override_still_wins_over_the_declaration(monkeypatch: pytest.MonkeyPatch):
    """The registry is overridable without a rebuild, credentials included.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv(
        "AGENT_HARNESS_CONFIG", json.dumps({"cursor": {"env_keys": ["CURSOR_TOKEN"]}})
    )
    harness = get_harness("cursor")
    assert harness is not None
    assert list(harness.credentials) == ["CURSOR_TOKEN"]
    assert list(REGISTRY["cursor"].credentials) == ["CURSOR_API_KEY"]


def test_oauth_companions_are_secrets_but_not_credentials():
    """A client id cannot authenticate alone, yet a caller still has to pass it."""
    auth = REGISTRY["antigravity"].auth
    assert "ANTIGRAVITY_CLIENT_ID" not in auth.env_names()
    assert "ANTIGRAVITY_CLIENT_ID" in auth.secret_names()
    assert "ANTIGRAVITY_CLIENT_SECRET" in auth.secret_names()


def test_credential_env_names_covers_every_harness_without_repeats():
    """The derived list is what workflows and the installer are meant to read."""
    names = harnesses.credential_env_names()
    assert len(names) == len(set(names))
    for harness in REGISTRY.values():
        assert set(harness.auth.secret_names()) <= set(names)


def test_agent_workflow_passes_exactly_the_declared_credentials():
    """A workflow missing a secret does not fail; it silently shortens the fallback chain.

    So the secrets block of `agent.yml` is asserted against the registry rather than trusted. The
    two GitHub secrets are the pipeline's own and are not harness credentials.
    """
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(root, ".github", "workflows", "agent.yml"), encoding="utf-8") as handle:
        workflow = handle.read()

    block = workflow.split("    secrets:\n", 1)[1].split("\npermissions:", 1)[0]
    declared = {
        line.strip().split(":", 1)[0] for line in block.splitlines() if ": {required" in line
    }
    assert declared - {"DARKFACTORY_APP_PRIVATE_KEY", "GH_PROJECT_TOKEN"} == set(
        harnesses.credential_env_names()
    )
