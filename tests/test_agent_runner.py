"""Unit tests for the autonomous agent runner's pure helpers."""

import json
import os
import subprocess
from typing import List

import pytest

import agent_runner
import harnesses
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


REPO_SLUG = "marius-patrik/DarkFactory"


class TestOneIssueTwoGates:
    """Both approvals live on one issue; which gate an approval answers is read from the issue."""

    def test_no_plan_yet_means_the_interpretation_was_approved(self, monkeypatch):
        """The first approval is of the interpretation, so a plan is what follows."""
        module = agent_runner_module()
        monkeypatch.setattr(module, "run_gh", lambda *a, **k: json.dumps({"comments": []}))
        assert module.has_plan(91, REPO_SLUG) is False

    def test_a_posted_plan_means_the_plan_is_what_is_approved(self, monkeypatch):
        """The second approval is of the plan, so implementation is what follows."""
        module = agent_runner_module()
        body = f"{module.PLAN_MARKER}\n### Implementation Plan"
        monkeypatch.setattr(
            module, "run_gh", lambda *a, **k: json.dumps({"comments": [{"body": body}]})
        )
        assert module.has_plan(91, REPO_SLUG) is True

    def test_an_ordinary_comment_is_not_mistaken_for_a_plan(self, monkeypatch):
        """Discussion on the issue must not advance the gate."""
        module = agent_runner_module()
        monkeypatch.setattr(
            module,
            "run_gh",
            lambda *a, **k: json.dumps({"comments": [{"body": "Looks good, one thought:"}]}),
        )
        assert module.has_plan(91, REPO_SLUG) is False

    def test_an_unreadable_issue_re_plans_rather_than_implementing(self, monkeypatch):
        """Failing towards planning is safe; failing towards implementing writes code unasked."""
        module = agent_runner_module()

        def boom(*a, **k):
            raise RuntimeError("unreachable")

        monkeypatch.setattr(module, "run_gh", boom)
        assert module.has_plan(91, REPO_SLUG) is False


class TestApprovalRecognition:
    """The approval is the gate the whole pipeline waits on, so recognising it must be right."""

    @pytest.mark.parametrize("text", ["approve", "Approve", "  approve  ", "lgtm", "/approve"])
    def test_a_bare_approval_is_recognised(self, text):
        """The ordinary case."""
        assert agent_runner_module().APPROVAL_PATTERN.search(text)

    def test_an_explained_approval_does_not_approve(self):
        """Feedback and approval are separate acts, and collapsing them loses the distinction.

        A comment carrying anything besides the word is feedback: it reaches `handle_respond`, the
        agent answers or amends, and the reviewer approves cleanly once satisfied. Accepting
        "three concerns, and approve" would leave nobody able to tell whether the concerns were
        meant to be addressed first.
        """
        body = "Checked it against the tree; the claim holds.\n\nOne correction below.\n\napprove"
        assert not agent_runner_module().APPROVAL_PATTERN.search(body)

    @pytest.mark.parametrize(
        "text",
        [
            "I would approve this once the test exists",
            "do not approve yet",
            "approval pending",
            "this needs work before I approve it",
        ],
    )
    def test_the_word_in_a_sentence_is_not_an_approval(self, text):
        """Approval must stay deliberate; a mention of the word is not a decision."""
        assert not agent_runner_module().APPROVAL_PATTERN.search(text)


def test_no_agent_heading_names_a_single_provider():
    """Headings named Antigravity whichever harness answered - here, Claude.

    The pipeline is harness-agnostic by design, so its own output should not claim otherwise.
    """
    source = _read_runner_source()
    offenders = [
        line for line in source.split("\n") if "### Antigravity" in line or "### Omnis" in line
    ]
    assert not offenders, f"agent headings name a provider: {offenders}"


def test_pull_requests_target_the_declared_default_branch():
    """`pr create --base main` fails outright where the trunk is called something else.

    The failure is reached only at the very end of an implementation run, after the agent has done
    all of the work, so it is worth catching in the source rather than in a run.
    """
    source = _read_runner_source()
    # Checking only for `"main",` missed `origin/main` in the branch creation, so the whole run
    # failed at its first git command after the pull request calls had been fixed.
    offenders = [
        line
        for line in source.split("\n")
        if ("origin/main" in line or '"main"' in line or "base=main" in line)
        and not line.strip().startswith("#")
        # `default_branch()` falls back to "main" for a repository with no manifest, which is the
        # one place the literal is right.
        and line.strip() != 'return "main"'
    ]
    assert not offenders, f"a branch name is hardcoded: {offenders}"
    assert "default_branch()" in source


class TestPlansPostedBeforeTheMarker:
    """The marker arrived with the merged gates; plans already posted carry only a heading."""

    @pytest.mark.parametrize(
        "body",
        [
            "<!-- darkfactory-plan -->\n### Implementation Plan",
            "## Implementation Plan\n\nObjectives",
            "### Implementation Plan (Autogenerated by the DarkFactory Agent)",
        ],
    )
    def test_a_plan_is_recognised_by_marker_or_heading(self, body):
        """An issue whose plan predates the marker must not be planned a second time."""
        assert agent_runner_module()._is_plan_comment(body)

    @pytest.mark.parametrize(
        "body",
        [
            "I think the implementation plan should mention tests",
            "approve",
            "Could you expand the plan section on verification?",
        ],
    )
    def test_discussion_about_a_plan_is_not_a_plan(self, body):
        """Otherwise a comment mentioning the plan would advance the gate."""
        assert not agent_runner_module()._is_plan_comment(body)


class TestRotatedTokenPersistence:
    """A rotating provider invalidates the old token as it issues the new one."""

    def test_a_rotated_token_is_written_back(self, monkeypatch):
        """Exchanging and then forgetting spends the credential: this run works, the next cannot."""
        module = agent_runner_module()
        seen = {}

        def fake_run(cmd, **kwargs):
            seen["cmd"] = cmd
            seen["input"] = kwargs.get("input")
            return type("R", (), {"stdout": "", "stderr": ""})()

        monkeypatch.setenv("GITHUB_REPOSITORY", "o/r")
        monkeypatch.setattr(module.subprocess, "run", fake_run)
        assert module.persist_rotated_token("ROTATING_TOKEN", "new-value") is True
        assert "new-value" not in " ".join(seen["cmd"]), "the value must not appear in argv"
        assert seen["input"] == "new-value"

    def test_without_a_repository_it_says_so_rather_than_failing_silently(self, monkeypatch):
        """Silence here means the next run fails to authenticate for no visible reason."""
        module = agent_runner_module()
        monkeypatch.delenv("GITHUB_REPOSITORY", raising=False)
        assert module.persist_rotated_token("ROTATING_TOKEN", "v") is False

    def test_a_failed_write_is_reported(self, monkeypatch):
        """The credential is already spent by then, so the run must not look successful."""
        module = agent_runner_module()

        def boom(cmd, **kwargs):
            raise subprocess.CalledProcessError(1, cmd, stderr="denied")

        monkeypatch.setenv("GITHUB_REPOSITORY", "o/r")
        monkeypatch.setattr(module.subprocess, "run", boom)
        assert module.persist_rotated_token("ROTATING_TOKEN", "v") is False

    def test_a_non_rotating_provider_writes_nothing(self, monkeypatch):
        """Google does not rotate; writing a secret on every run would be noise and risk."""
        import harnesses

        module = agent_runner_module()
        monkeypatch.setenv("ANTIGRAVITY_REFRESH_TOKEN", "stored")
        monkeypatch.setattr(
            module,
            "exchange_refresh_token",
            lambda *a, **k: {"access_token": "fresh", "refresh_token": "unexpected"},
        )
        monkeypatch.setattr(
            module, "persist_rotated_token", lambda *a: pytest.fail("must not write")
        )
        module.prepare_credentials(harnesses.get_harness("antigravity"))


class TestTheAccountsCredentialReachesTheCli:
    """A CLI reads the name it knows, so account two's secret has to arrive under account one's."""

    def _attempt(self, name: str, account: int):
        """Builds an attempt against a registry harness.

        Args:
            name: Registry key.
            account: 1-based account number.

        Returns:
            The attempt.
        """
        return harnesses.Attempt(harnesses.REGISTRY[name], None, account)

    def test_the_second_accounts_key_arrives_under_the_canonical_name(self, monkeypatch):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN_2", "second")
        env = agent_runner.credential_env(dict(os.environ), self._attempt("claude", 2))
        assert env["CLAUDE_CODE_OAUTH_TOKEN"] == "second"

    def test_the_other_accounts_names_are_cleared(self, monkeypatch):
        """Leaving the first account's key in place means the rotation achieves nothing, silently.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("ANTHROPIC_API_KEY", "first-account")
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN_2", "second")
        env = agent_runner.credential_env(dict(os.environ), self._attempt("claude", 2))
        assert env["CLAUDE_CODE_OAUTH_TOKEN"] == "second"
        assert env["ANTHROPIC_API_KEY"] == "second"
        assert "CLAUDE_CODE_OAUTH_TOKEN_2" not in env

    def test_no_credential_survives_from_an_account_that_is_not_running(self, monkeypatch):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", "first")
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN_3", "third")
        env = agent_runner.credential_env(dict(os.environ), self._attempt("claude", 3))
        assert env["CLAUDE_CODE_OAUTH_TOKEN"] == "third"
        assert "CLAUDE_CODE_OAUTH_TOKEN_3" not in env

    def test_oauth_companions_move_with_their_account(self, monkeypatch):
        """A second Google account has its own client, and the exchange needs it.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("ANTIGRAVITY_CLIENT_ID_2", "client-two")
        monkeypatch.setenv("ANTIGRAVITY_CLIENT_SECRET_2", "secret-two")
        monkeypatch.setenv("ANTIGRAVITY_REFRESH_TOKEN_2", "refresh-two")
        monkeypatch.setattr(
            agent_runner, "exchange_refresh_token", lambda *a, **k: {"access_token": "fresh"}
        )
        env = agent_runner.credential_env(dict(os.environ), self._attempt("antigravity", 2))
        assert env["ANTIGRAVITY_CLIENT_ID"] == "client-two"
        assert env["ANTIGRAVITY_CLIENT_SECRET"] == "secret-two"

    def test_a_harness_declaring_no_auth_is_passed_through_untouched(self):
        """A harness defined entirely through configuration may authenticate however it likes."""
        harness = harnesses.Harness(name="x", binary="x", template=[], auth=None)
        base = {"SOMETHING": "kept"}
        assert agent_runner.credential_env(base, harnesses.Attempt(harness, None, 1)) == base


class TestExhaustionRotatesBeforeItWaits:
    """An unused account is always a better answer than sleeping."""

    def _two_accounts(self, monkeypatch):
        """Puts two Claude accounts in the environment and pretends the binary exists.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("AGENT_HARNESS_CHAIN", "claude")
        monkeypatch.delenv("AGENT_HARNESS_CONFIG", raising=False)
        monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
        for name in harnesses.REGISTRY["claude"].auth.secret_names():
            monkeypatch.delenv(name, raising=False)
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", "one")
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN_2", "two")

    def test_the_second_account_is_tried_and_nothing_sleeps(self, monkeypatch):
        """This is the whole point of holding a second account.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_accounts(monkeypatch)
        slept: List[float] = []
        monkeypatch.setattr(agent_runner.time, "sleep", lambda s: slept.append(s))

        seen: List[str] = []

        def fake_run(argv, **kwargs):
            seen.append(kwargs["env"].get("CLAUDE_CODE_OAUTH_TOKEN", ""))
            if len(seen) == 1:
                raise subprocess.CalledProcessError(1, argv, stderr="rate limit exceeded")
            return subprocess.CompletedProcess(argv, 0, stdout="done", stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("do it") == "done"
        assert seen == ["one", "two"], "the second attempt must use the second account"
        assert slept == [], "there was an unused account; nothing should have waited"

    def test_the_backoff_still_applies_when_there_is_nothing_to_rotate_to(self, monkeypatch):
        """The last attempt is the only place waiting can possibly help.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("AGENT_HARNESS_CHAIN", "claude")
        monkeypatch.delenv("AGENT_HARNESS_CONFIG", raising=False)
        monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
        for name in harnesses.REGISTRY["claude"].auth.secret_names():
            monkeypatch.delenv(name, raising=False)
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", "only")

        slept: List[float] = []
        monkeypatch.setattr(agent_runner.time, "sleep", lambda s: slept.append(s))
        calls: List[int] = []

        def fake_run(argv, **kwargs):
            calls.append(1)
            if len(calls) < 3:
                raise subprocess.CalledProcessError(1, argv, stderr="rate limit exceeded")
            return subprocess.CompletedProcess(argv, 0, stdout="done", stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("do it") == "done"
        assert slept, "with one account and nothing else to try, backoff is all there is"

    def test_a_real_bug_is_not_answered_by_burning_every_account(self, monkeypatch):
        """Falling through on a genuine error would spend every account on the same broken prompt.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_accounts(monkeypatch)
        calls: List[int] = []

        def fake_run(argv, **kwargs):
            calls.append(1)
            raise subprocess.CalledProcessError(2, argv, stderr="syntax error in prompt file")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        result = agent_runner.run_agent_prompt("do it")
        assert "[DarkFactory Agent Execution Error]" in result
        assert len(calls) == 1


class TestGhCliHandling:
    """The agent runner must survive non-fatal gh command failures."""

    def test_run_gh_includes_stderr_in_called_process_error(self, monkeypatch):
        """CalledProcessError must convey the error output from gh."""
        module = agent_runner_module()

        def fail_run(cmd, **kwargs):
            return subprocess.CompletedProcess(cmd, 1, stdout="", stderr="HTTP 404: Not Found")

        monkeypatch.setattr(module.subprocess, "run", fail_run)
        with pytest.raises(subprocess.CalledProcessError) as exc_info:
            module.run_gh(["issue", "view", "1"])
        assert "HTTP 404: Not Found" in str(exc_info.value.stderr)

    def test_try_gh_returns_stdout_on_success(self, monkeypatch):
        """Successful execution returns stripped stdout."""
        module = agent_runner_module()

        def ok_run(cmd, **kwargs):
            return subprocess.CompletedProcess(cmd, 0, stdout="hello world\n", stderr="")

        monkeypatch.setattr(module.subprocess, "run", ok_run)
        assert module.try_gh(["status"]) == "hello world"

    def test_try_gh_returns_none_on_error_without_raising(self, monkeypatch, capsys):
        """A failure does not raise and logs to stderr."""
        module = agent_runner_module()

        def fail_run(cmd, **kwargs):
            return subprocess.CompletedProcess(cmd, 1, stdout="", stderr="label does not exist")

        monkeypatch.setattr(module.subprocess, "run", fail_run)
        result = module.try_gh(["issue", "edit", "12", "--add-label", "ci"], doing="label #12")
        assert result is None
        err = capsys.readouterr().err
        assert "Could not label #12: label does not exist" in err
