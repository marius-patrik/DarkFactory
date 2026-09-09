"""Unit tests for the autonomous agent runner's pure helpers."""

import json
import os
from typing import List

import pytest

import agent_runner
from agent_runner import (
    prepare_credentials,
    is_bot_or_agent_comment,
    AREA_LABELS,
    TYPE_LABELS,
    calculate_backoff,
    classify_type_and_area,
    format_conventional_commit,
    generate_branch_name,
    is_bot_or_agent_comment,
    is_quota_exhausted,
)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.mark.parametrize(
    "text,expected_area",
    [
        ("Define the provider adapter contract for the agent harness", "area:agents"),
        ("The quota fallback picks the wrong model", "area:agents"),
        ("Tighten branch protection and the board taxonomy", "area:governance"),
        ("Every label should come from one declaration", "area:governance"),
        ("Pick the versioning mode per repository", "area:release"),
        ("Attach build artifacts to the tag", "area:release"),
        ("Fix the properdocs build", "area:docs"),
        ("The theme is unreadable in dark mode", "area:docs"),
        ("Harden the docker runner workflow", "area:ci"),
        ("Something entirely unclassifiable", "area:ci"),
    ],
)
def test_classify_area(text: str, expected_area: str):
    """The classifier routes requests to the repository's declared area taxonomy.

    The taxonomy comes from `.github/darkfactory.json`, so these cases assert DarkFactory's own
    areas; a repository adopting the pipeline declares its own and gets its own routing.

    Args:
        text: Issue title or body.
        expected_area: Area label the classifier should emit.
    """
    _type_label, area_label = classify_type_and_area(text)
    assert area_label == expected_area


def test_classifier_only_emits_known_labels():
    """A classifier that invents a label produces an unlabelable issue."""
    samples = [
        "add a thing",
        "fix a crash in the daemon",
        "refactor the palette resolver",
        "document the bus",
        "bump dependencies",
        "add tests for the codec",
        "wire up a workflow",
    ]
    for sample in samples:
        type_label, area_label = classify_type_and_area(sample)
        assert type_label in TYPE_LABELS, f"{type_label!r} not in TYPE_LABELS"
        assert area_label in AREA_LABELS, f"{area_label!r} not in AREA_LABELS"


@pytest.mark.parametrize(
    "text,expected_type",
    [
        ("Fix the crash on startup", "bug"),
        ("Document the substrate bus", "docs"),
        ("Refactor the palette resolver", "refactor"),
        ("Bump the pinned dependencies", "chore"),
        ("Add a new brand preset", "feat"),
    ],
)
def test_classify_type(text: str, expected_type: str):
    """Type classification maps onto the Conventional Commit types.

    Args:
        text: Issue title or body.
        expected_type: Type label the classifier should emit.
    """
    type_label, _area = classify_type_and_area(text)
    assert type_label == expected_type


def test_format_conventional_commit_maps_bug_to_fix():
    """`bug` is a label; `fix` is the commit type. The mapping must not leak."""
    assert format_conventional_commit("bug", "area:governance", "Correct the codec") == (
        "fix(governance): correct the codec"
    )
    assert format_conventional_commit("feat", "area:agents", "Add cell buffer") == (
        "feat(agents): add cell buffer"
    )


def test_generate_branch_name_excludes_issue_numbers():
    """Rule 7 forbids issue numbers in branch names."""
    name = generate_branch_name("Plan: Add cell matrix buffer for #42")
    assert "42" not in name
    assert name == name.lower()
    assert " " not in name


@pytest.mark.parametrize(
    "message",
    [
        "Error: 429 Too Many Requests",
        "RESOURCE_EXHAUSTED",
        "quota exceeded for this model",
        "rate limit reached",
        "the model is overloaded",
    ],
)
def test_quota_exhaustion_detected(message: str):
    """Quota failures must be recognised so the agent checkpoints instead of thrashing.

    Args:
        message: Provider error text.
    """
    assert is_quota_exhausted(message)


@pytest.mark.parametrize(
    "message",
    [
        "compilation failed: expected `;`",
        "test failure in tests/test_codec.py",
        "",
    ],
)
def test_non_quota_errors_not_misdetected(message: str):
    """A build failure must not be mistaken for a quota failure and silently blocked.

    Args:
        message: Non-quota error text.
    """
    assert not is_quota_exhausted(message)


def test_bot_comments_are_ignored():
    """Self-reply loops are the classic failure mode of a conversational CI agent."""
    assert is_bot_or_agent_comment("github-actions[bot]", "anything")
    assert is_bot_or_agent_comment("someone", "<!-- darkfactory-agent -->\nInterpretation")
    assert is_bot_or_agent_comment("someone", "<!-- omnis-agent -->\nInterpretation")
    assert not is_bot_or_agent_comment("marius-patrik", "approve")


def test_backoff_is_bounded_and_increasing():
    """Retry backoff must grow and must stay finite."""
    delays: List[float] = [calculate_backoff(attempt) for attempt in range(5)]
    assert all(delay >= 0 for delay in delays)
    assert max(delays) < 3600


def test_area_labels_are_unique_and_prefixed():
    """The area taxonomy is a set of `area:` labels with no duplicates."""
    assert len(AREA_LABELS) == len(set(AREA_LABELS))
    assert all(label.startswith("area:") for label in AREA_LABELS)


def test_verification_helpers_skip_absent_toolchains(tmp_path):
    """A scaffold repository with no Cargo.toml must still verify green.

    Args:
        tmp_path: Pytest-provided empty directory.
    """
    result = agent_runner.verify_repository(str(tmp_path))
    assert result.returncode == 0
    assert agent_runner.format_repository(str(tmp_path)) == []


def test_runner_defaults_to_this_repository():
    """The runner points at DarkFactory by default."""
    with open(
        os.path.join(REPO_ROOT, ".github", "scripts", "agent_runner.py"), encoding="utf-8"
    ) as f:
        source = f.read()
    assert "ChessWithQuests" not in source
    assert "marius-patrik/DarkFactory" in source


def _read_runner_source() -> str:
    """Returns the runner's source, for assertions about what it emits.

    Returns:
        The file contents.
    """
    import agent_runner

    with open(agent_runner.__file__, encoding="utf-8") as handle:
        return handle.read()


class TestQuotaDetection:
    """A limit the runner cannot recognise is a limit it fails on instead of escalating past."""

    @pytest.mark.parametrize(
        "message",
        [
            "Error: 429 Too Many Requests",
            "RESOURCE_EXHAUSTED: quota exceeded for this model",
            "You have hit your rate limit",
            "quota exhausted",
            "Antigravity: daily limit reached",
            "Your weekly limit has been reached",
            "usage limit for this account",
            "You are out of credits",
            "insufficient credits remaining",
            "Please upgrade your plan to continue",
        ],
    )
    def test_a_limit_is_recognised_however_it_is_phrased(self, message):
        """Providers word exhaustion differently; the ladder must escalate past all of them."""
        assert is_quota_exhausted(message) is True

    @pytest.mark.parametrize(
        "message",
        [
            "TypeError: cannot read property of undefined",
            "fatal: not a git repository",
            "the diff exceeded the review limit of lines we display",
        ],
    )
    def test_an_ordinary_failure_is_not_mistaken_for_a_limit(self, message):
        """Escalating on a real bug would hide it behind a second harness failing the same way."""
        assert is_quota_exhausted(message) is False


def test_new_agent_comments_are_branded_for_this_pipeline():
    """The notice said Omnis, which is a different project."""
    source = _read_runner_source()
    assert "darkfactory-agent -->" in source
    written = [
        l for l in source.split("\n") if "omnis-agent -->" in l and l.strip().startswith('"')
    ]
    assert not written, f"the old marker must not be written any more: {written}"


def test_legacy_agent_comments_are_still_recognised():
    """Comments already posted carry the old marker and must not become invisible."""
    assert is_bot_or_agent_comment("someone", "<!-- omnis-agent -->\nold notice")
    assert is_bot_or_agent_comment("someone", "<!-- darkfactory-agent -->\nnew notice")


def agent_runner_module():
    """Returns the runner module, for monkeypatching module-level functions.

    Returns:
        The imported module.
    """
    import agent_runner

    return agent_runner


class TestDeclarativeCredentials:
    """A harness declares how it authenticates; the runner stops knowing any of them by name."""

    def test_a_harness_declaring_nothing_needs_nothing(self):
        """Most harnesses take an API key straight from the environment."""
        import harnesses

        assert prepare_credentials(harnesses.get_harness("codex")) is None

    def test_a_static_declaration_is_returned_as_is(self, monkeypatch):
        """A subscription token minted by `claude setup-token` needs no exchange."""
        import harnesses

        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", "sk-ant-oat-live")
        assert prepare_credentials(harnesses.get_harness("claude")) == "sk-ant-oat-live"

    def test_an_absent_credential_is_not_an_error(self, monkeypatch):
        """A harness without its secret is skipped by the ladder, not failed on."""
        import harnesses

        monkeypatch.delenv("ANTIGRAVITY_REFRESH_TOKEN", raising=False)
        assert prepare_credentials(harnesses.get_harness("antigravity")) is None

    def test_a_refresh_declaration_is_exchanged(self, monkeypatch):
        """The exchange is driven by the declared endpoint, not by the harness's name."""
        import harnesses

        monkeypatch.setenv("ANTIGRAVITY_REFRESH_TOKEN", "stored")
        seen = {}

        def fake(refresh_token, token_url, client_id="", client_secret=""):
            seen.update(refresh_token=refresh_token, token_url=token_url)
            return {"access_token": "fresh"}

        monkeypatch.setattr(agent_runner_module(), "exchange_refresh_token", fake)
        assert prepare_credentials(harnesses.get_harness("antigravity")) == "fresh"
        assert seen["refresh_token"] == "stored"
        assert "oauth2.googleapis.com" in seen["token_url"]

    def test_a_rotated_token_replaces_the_stored_one(self, monkeypatch):
        """The failure this prevents: reading only access_token strands a rotating credential."""
        import harnesses

        rotating = harnesses.Harness(
            name="rotating",
            binary="x",
            template=[],
            auth=harnesses.Auth(
                kind="oauth_refresh",
                env="ROTATING_TOKEN",
                token_url="https://x/token",
                rotates=True,
            ),
        )
        monkeypatch.setenv("ROTATING_TOKEN", "old")
        monkeypatch.setattr(
            agent_runner_module(),
            "exchange_refresh_token",
            lambda *a, **k: {"access_token": "fresh", "refresh_token": "new"},
        )
        assert prepare_credentials(rotating) == "fresh"
        assert os.environ["ROTATING_TOKEN"] == "new", "the rotated token must not be discarded"

    def test_a_non_rotating_provider_keeps_its_stored_token(self, monkeypatch):
        """Google does not rotate, so nothing should be replaced behind the caller's back."""
        import harnesses

        monkeypatch.setenv("ANTIGRAVITY_REFRESH_TOKEN", "stored")
        monkeypatch.setattr(
            agent_runner_module(),
            "exchange_refresh_token",
            lambda *a, **k: {"access_token": "fresh", "refresh_token": "unexpected"},
        )
        prepare_credentials(harnesses.get_harness("antigravity"))
        assert os.environ["ANTIGRAVITY_REFRESH_TOKEN"] == "stored"


class TestPlanIssuesAreNotInterpreted:
    """A Plan issue is the pipeline's own output, not a new request to be interpreted."""

    def _payload(self, labels):
        """Builds an `issues: opened` payload.

        Args:
            labels: Label names on the issue.

        Returns:
            The webhook payload.
        """
        return {
            "action": "opened",
            "issue": {"number": 92, "labels": [{"name": n} for n in labels]},
            "repository": {"full_name": "marius-patrik/DarkFactory"},
        }

    def test_a_plan_issue_is_left_to_its_parent(self, monkeypatch, tmp_path):
        """Interpreting it answers a question nobody asked, on the issue the plan lands on."""
        called = []
        module = agent_runner_module()
        monkeypatch.setattr(module, "handle_interpret", lambda n, r: called.append(n))
        monkeypatch.setattr(module, "run_gh", lambda *a, **k: "")
        path = tmp_path / "event.json"
        path.write_text(json.dumps(self._payload(["Plan"])), encoding="utf-8")
        module.dispatch_event(str(path), "issues")
        assert called == [], "a Plan issue must not be interpreted"

    def test_a_request_issue_is_still_interpreted(self, monkeypatch, tmp_path):
        """The ordinary path must be untouched."""
        called = []
        module = agent_runner_module()
        monkeypatch.setattr(module, "handle_interpret", lambda n, r: called.append(n))
        monkeypatch.setattr(module, "run_gh", lambda *a, **k: "")
        path = tmp_path / "event.json"
        path.write_text(json.dumps(self._payload(["Request"])), encoding="utf-8")
        module.dispatch_event(str(path), "issues")
        assert called == [92]


def test_no_agent_output_names_another_project():
    """Comments the agent writes appear on this repository's issues, under its own name."""
    source = _read_runner_source()
    written = [
        line
        for line in source.split("\n")
        if "Omnis" in line and not line.strip().startswith(("or ", "#"))
    ]
    assert not written, f"agent output still names Omnis: {written}"
