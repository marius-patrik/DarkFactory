"""Unit tests for the autonomous agent runner's pure helpers."""

import inspect
import json
from pathlib import Path
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
    ("function_name", "expected_kinds"),
    [
        ("handle_interpret", ("classify",)),
        ("handle_plan", ("plan",)),
        ("handle_respond", ("chat",)),
        ("handle_implement", ("implement", "fix")),
        ("run_pr_feedback_fix", ("fix",)),
        ("run_self_review_iteration", ("review",)),
        ("run_self_review_fix", ("fix",)),
        ("handle_plan_alignment", ("review",)),
    ],
)
def test_governed_stage_declares_existing_task_kind(
    function_name: str, expected_kinds: tuple[str, ...]
):
    """Every governed bootstrap stage declares its semantic kind at the df boundary."""
    source = inspect.getsource(getattr(agent_runner, function_name))
    assert source.count("run_agent_prompt(") == len(expected_kinds)
    for kind in expected_kinds:
        assert source.count(f'kind="{kind}"') == 1


@pytest.mark.parametrize(
    "text,expected_area",
    [
        ("Define the provider adapter contract for the agent harness", "area:agents"),
        ("The quota fallback picks the wrong model", "area:agents"),
        ("Tighten branch protection and the board taxonomy", "area:governance"),
        ("Every label should come from one declaration", "area:governance"),
        ("Pick the versioning mode per repository", "area:release"),
        ("Attach build artifacts to the tag", "area:release"),
        ("Fix the typedoc build", "area:docs"),
        ("The content graph fails on documentation pages", "area:docs"),
        ("Harden the docker runner workflow", "area:ci"),
        ("Something entirely unclassifiable", "area:ci"),
    ],
)
def test_classify_area(text: str, expected_area: str):
    """The classifier routes requests to the repository's declared area taxonomy.

    The taxonomy comes from `.darkfactory/repo.df`, so these cases assert DarkFactory's own
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
        ("Add retry when the upload fails", "feat"),
        ("Improve error handling in the upload path", "feat"),
        ("A regression in auth breaks login", "bug"),
        ("The login form is broken", "bug"),
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


def test_classify_type_prefers_request_type_section():
    """The issue-form ``Request Type`` declaration wins over prose keywords."""
    body = (
        "### Verbatim User Request\n\n"
        "Add failover when the upload fails and improve error handling.\n\n"
        "### Request Type\n\n"
        "feat (new feature)\n\n"
        "### Additional Context\n\n"
        "A crash was mentioned only as prior art.\n"
    )
    type_label, _area = classify_type_and_area(body)
    assert type_label == "feat"


def test_classify_type_uses_declared_bug_from_request_type_section():
    """A declared bug stays a bug even when the prose reads like a feature."""
    body = (
        "### Request Type\n\n"
        "bug (bug fix)\n\n"
        "### Verbatim User Request\n\n"
        "Add clearer messages when retries succeed.\n"
    )
    type_label, _area = classify_type_and_area(body)
    assert type_label == "bug"


def test_format_conventional_commit_maps_bug_to_fix():
    """`bug` is a label; `fix` is the commit type. The mapping must not leak."""
    assert format_conventional_commit("bug", "area:governance", "Correct the codec") == (
        "fix(governance): correct the codec"
    )
    assert format_conventional_commit("feat", "area:agents", "Add cell buffer") == (
        "feat(agents): add cell buffer"
    )


def test_generate_branch_name_excludes_issue_numbers():
    """DF-RULE-007 (`.agents/rules/007-branches-and-pull-requests.md`) forbids issue numbers in branch names."""
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


def test_node_helpers_use_bun_when_npm_is_absent(monkeypatch, tmp_path):
    """A Bun-only agent image must run declared package scripts without reaching for npm.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided temporary repository.
    """
    (tmp_path / "package.json").write_text(
        json.dumps({"scripts": {"format": "echo format", "test": "echo test"}}),
        encoding="utf-8",
    )
    seen = []

    def which(name):
        return "/usr/local/bin/bun" if name == "bun" else None

    def run(cmd, **kwargs):
        seen.append(cmd)
        return subprocess.CompletedProcess(args=cmd, returncode=0, stdout="", stderr="")

    monkeypatch.setattr(agent_runner.shutil, "which", which)
    monkeypatch.setattr(agent_runner.subprocess, "run", run)

    assert agent_runner.format_repository(str(tmp_path)) == ["web formatter"]
    assert agent_runner.verify_repository(str(tmp_path)).returncode == 0
    assert ["bun", "run", "format"] in seen
    assert ["bun", "run", "test"] in seen
    assert not any(cmd[0] == "npm" for cmd in seen)


def test_node_verification_fails_cleanly_without_a_package_runner(monkeypatch, tmp_path):
    """A declared test with no runner reports a verification failure instead of raising.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided temporary repository.
    """
    (tmp_path / "package.json").write_text(
        json.dumps({"scripts": {"test": "echo test"}}),
        encoding="utf-8",
    )
    monkeypatch.setattr(agent_runner.shutil, "which", lambda _name: None)

    result = agent_runner.verify_repository(str(tmp_path))

    assert result.returncode == 127
    assert "no Bun/npm/pnpm/yarn runner" in result.stderr


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


@pytest.fixture(autouse=True)
def _pr_branch_is_checked_out(request, monkeypatch):
    """Review and fix runs check out the PR branch first; their unit tests run on a stub checkout."""
    if request.cls is not None and request.cls.__name__ in (
        "TestSelfReviewFix",
        "TestRunSelfReviewIterationAndFindings",
        "TestPrFeedbackRevision",
    ):
        module = agent_runner_module()
        monkeypatch.setattr(
            module, "checkout_pr_branch", lambda pr, repo, cwd=None: "feature/branch"
        )


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

    def test_a_pipeline_failure_issue_is_not_interpreted(self, monkeypatch, tmp_path):
        """The pipeline reporting on itself is not a request, and answering it re-fires automations."""
        called = []
        module = agent_runner_module()
        monkeypatch.setattr(module, "handle_interpret", lambda n, r: called.append(n))
        monkeypatch.setattr(module, "run_gh", lambda *a, **k: "")
        path = tmp_path / "event.json"
        path.write_text(json.dumps(self._payload(["pipeline-failure"])), encoding="utf-8")
        module.dispatch_event(str(path), "issues")
        assert called == [], "a pipeline-failure issue must not be interpreted"

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
        assert "ANTHROPIC_API_KEY" not in env
        assert "CLAUDE_CODE_OAUTH_TOKEN_2" not in env

    def test_a_subscription_token_is_never_exported_as_an_api_key(self, monkeypatch):
        """The claude CLI prefers ANTHROPIC_API_KEY; an OAuth token there fails as an invalid key.

        Plan run 34833536164 on #227 failed with "401 API key is invalid": the subscription token
        was exported under every name the harness accepts, including the API-key name.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", "subscription-token")
        env = agent_runner.credential_env(dict(os.environ), self._attempt("claude", 1))
        assert env["CLAUDE_CODE_OAUTH_TOKEN"] == "subscription-token"
        assert "ANTHROPIC_API_KEY" not in env

    def test_an_api_key_account_is_exported_only_as_an_api_key(self, monkeypatch):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.delenv("CLAUDE_CODE_OAUTH_TOKEN", raising=False)
        monkeypatch.setenv("ANTHROPIC_API_KEY_2", "api-key-two")
        env = agent_runner.credential_env(dict(os.environ), self._attempt("claude", 2))
        assert env["ANTHROPIC_API_KEY"] == "api-key-two"
        assert "CLAUDE_CODE_OAUTH_TOKEN" not in env

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


class TestLoginFileCredentialLifecycle:
    """Subscription CLIs authenticate through files written to disk rather than environment keys."""

    def _attempt(self, name: str, account: int):
        return harnesses.Attempt(harnesses.REGISTRY[name], None, account)

    def test_file_written_with_right_content_path_and_mode_for_account_2(
        self, monkeypatch, tmp_path
    ):
        """Account 2's secret materializes at the declared path under HOME with 0600 mode."""
        import stat
        import sys

        monkeypatch.setenv("HOME", str(tmp_path))
        base = {"HOME": str(tmp_path), "CODEX_AUTH_JSON_2": '{"token": "codex-account-2"}'}
        attempt = self._attempt("codex", 2)

        chmod_calls = []
        real_chmod = os.chmod

        def spy_chmod(path, mode):
            chmod_calls.append((path, mode))
            real_chmod(path, mode)

        monkeypatch.setattr(agent_runner.os, "chmod", spy_chmod)

        result = agent_runner.prepare_login_file(base, attempt)
        assert result is not None
        path, secret_name, original = result

        expected_path = os.path.join(str(tmp_path), ".codex", "auth.json")
        assert path == expected_path
        assert secret_name == "CODEX_AUTH_JSON_2"
        assert original == '{"token": "codex-account-2"}'
        assert os.path.exists(path)
        with open(path, "r", encoding="utf-8") as f:
            assert f.read() == '{"token": "codex-account-2"}'

        assert (path, 0o600) in chmod_calls
        if sys.platform != "win32":
            assert (stat.S_IMODE(os.stat(path).st_mode)) == 0o600

    def test_nested_parent_directories_are_created(self, monkeypatch, tmp_path):
        """Parent directories are created for deep login file paths (e.g. kimi)."""
        monkeypatch.setenv("HOME", str(tmp_path))
        base = {
            "HOME": str(tmp_path),
            "KIMI_AUTH_JSON_2": '{"kimi_token": "secret-2"}',
        }
        attempt = self._attempt("kimi", 2)

        result = agent_runner.prepare_login_file(base, attempt)
        assert result is not None
        path, secret_name, original = result
        expected_path = os.path.join(str(tmp_path), ".kimi-code", "credentials", "kimi-code.json")
        assert path == expected_path
        assert secret_name == "KIMI_AUTH_JSON_2"
        assert original == '{"kimi_token": "secret-2"}'
        assert os.path.exists(path)

    def test_static_key_names_are_not_exported_when_login_file_is_used(self):
        """When an attempt uses a subscription login file, static API keys must not be exported."""
        attempt = self._attempt("codex", 2)
        base = {
            "OPENAI_API_KEY": "first-key",
            "OPENAI_API_KEY_2": "second-key",
            "CODEX_AUTH_JSON_2": '{"token": "second-login"}',
        }
        env = agent_runner.credential_env(base, attempt)
        assert "OPENAI_API_KEY" not in env
        assert "OPENAI_API_KEY_2" not in env
        assert "CODEX_AUTH_JSON_2" not in env
        assert "CODEX_AUTH_JSON" not in env

    def test_a_changed_file_is_persisted_to_the_same_numbered_secret(self, tmp_path, monkeypatch):
        """Token rotation writes back to the exact account that provided the login file."""
        module = agent_runner_module()
        target_file = tmp_path / "auth.json"
        target_file.write_text('{"token": "new-rotated-token"}', encoding="utf-8")

        persisted = []
        monkeypatch.setattr(
            module,
            "persist_rotated_token",
            lambda secret, value: persisted.append((secret, value)) or True,
        )

        state = (str(target_file), "CODEX_AUTH_JSON_2", '{"token": "original-token"}')
        module.finish_login_file(state, rotates=True)

        assert persisted == [("CODEX_AUTH_JSON_2", '{"token": "new-rotated-token"}')]
        assert not target_file.exists(), "login file must be removed after attempt"

    def test_an_unchanged_file_is_not_persisted(self, tmp_path, monkeypatch):
        """Unchanged login files are not written back, but are still cleaned up."""
        module = agent_runner_module()
        target_file = tmp_path / "auth.json"
        target_file.write_text('{"token": "same-token"}', encoding="utf-8")

        monkeypatch.setattr(
            module,
            "persist_rotated_token",
            lambda *a: pytest.fail("must not write unchanged token"),
        )

        state = (str(target_file), "CODEX_AUTH_JSON_2", '{"token": "same-token"}')
        module.finish_login_file(state, rotates=True)

        assert not target_file.exists(), "login file must be removed after attempt"

    def test_a_non_rotating_login_file_is_not_persisted_even_if_changed(
        self, tmp_path, monkeypatch
    ):
        """When rotates is False, no persistence occurs even if the content changed."""
        module = agent_runner_module()
        target_file = tmp_path / "auth.json"
        target_file.write_text('{"token": "new-token"}', encoding="utf-8")

        monkeypatch.setattr(
            module,
            "persist_rotated_token",
            lambda *a: pytest.fail("must not write when rotates=False"),
        )

        state = (str(target_file), "CODEX_AUTH_JSON_2", '{"token": "old-token"}')
        module.finish_login_file(state, rotates=False)

        assert not target_file.exists(), "login file must still be removed"

    def test_run_agent_prompt_end_to_end_with_login_file_rotation(self, monkeypatch, tmp_path):
        """run_agent_prompt manages the login file lifecycle, suppresses static keys, and persists rotation."""
        monkeypatch.setenv("HOME", str(tmp_path))
        monkeypatch.setenv("AGENT_HARNESS_CHAIN", "codex")
        monkeypatch.delenv("AGENT_HARNESS_CONFIG", raising=False)
        monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
        for name in harnesses.REGISTRY["codex"].auth.secret_names():
            monkeypatch.delenv(name, raising=False)

        monkeypatch.setenv("CODEX_AUTH_JSON_2", '{"auth": "v1"}')

        login_path = tmp_path / ".codex" / "auth.json"
        captured_env = {}
        persisted = []

        def fake_run(argv, **kwargs):
            captured_env.update(kwargs["env"])
            assert login_path.exists()
            assert login_path.read_text(encoding="utf-8") == '{"auth": "v1"}'
            login_path.write_text('{"auth": "v2"}', encoding="utf-8")
            return subprocess.CompletedProcess(argv, 0, stdout="done\n", stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        monkeypatch.setattr(
            agent_runner,
            "persist_rotated_token",
            lambda secret, val: persisted.append((secret, val)) or True,
        )

        result = agent_runner.run_agent_prompt("test prompt")
        assert result == "done"
        assert not login_path.exists(), "login file must be removed after attempt"
        assert persisted == [("CODEX_AUTH_JSON_2", '{"auth": "v2"}')]
        assert "OPENAI_API_KEY" not in captured_env
        assert "OPENAI_API_KEY_2" not in captured_env
        assert "CODEX_AUTH_JSON_2" not in captured_env

    def test_run_agent_prompt_persists_and_cleans_up_on_failure(self, monkeypatch, tmp_path):
        """CLI invocation failure still persists any rotated token and removes the file."""
        monkeypatch.setenv("HOME", str(tmp_path))
        monkeypatch.setenv("AGENT_HARNESS_CHAIN", "codex")
        monkeypatch.delenv("AGENT_HARNESS_CONFIG", raising=False)
        monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
        for name in harnesses.REGISTRY["codex"].auth.secret_names():
            monkeypatch.delenv(name, raising=False)

        monkeypatch.setenv("CODEX_AUTH_JSON_2", '{"auth": "v1"}')

        login_path = tmp_path / ".codex" / "auth.json"
        persisted = []

        def fail_run(argv, **kwargs):
            assert login_path.exists()
            login_path.write_text('{"auth": "v2-rotated-before-fail"}', encoding="utf-8")
            raise subprocess.CalledProcessError(1, argv, stderr="failed execution")

        monkeypatch.setattr(agent_runner.subprocess, "run", fail_run)
        monkeypatch.setattr(
            agent_runner,
            "persist_rotated_token",
            lambda secret, val: persisted.append((secret, val)) or True,
        )

        result = agent_runner.run_agent_prompt("test prompt")
        assert "[DarkFactory Agent Execution Error]" in result
        assert not login_path.exists(), "login file must be removed even on failure"
        assert persisted == [("CODEX_AUTH_JSON_2", '{"auth": "v2-rotated-before-fail"}')]


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
            raise subprocess.CalledProcessError(1, argv, stderr="syntax error in prompt file")

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


class TestEmptyAgentOutputIsAFailedAttempt:
    """Exit 0 with no usable text must rotate the ladder, not post an empty shell comment.

    `agy --print-timeout 5m0s` spends its budget and exits 0 with no body, and the old runner
    returned that empty string as the agent's perfect answer - the workflow passed, the comment
    was a heading with nothing under it. Every rung that yields nothing must be a failed attempt,
    and a run where nothing yields text must fail the workflow rather than report success.
    """

    def _two_codex_accounts(self, monkeypatch):
        """Puts two Codex accounts in the environment and pretends the binary exists.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("AGENT_HARNESS_CHAIN", "codex")
        monkeypatch.delenv("AGENT_HARNESS_CONFIG", raising=False)
        monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
        for name in harnesses.REGISTRY["codex"].auth.secret_names():
            monkeypatch.delenv(name, raising=False)
        monkeypatch.setenv("OPENAI_API_KEY", "one")
        monkeypatch.setenv("OPENAI_API_KEY_2", "two")

    def test_empty_stdout_rotates_to_the_next_account(self, monkeypatch):
        """A 0-exit with no stdout is a failed attempt, so the second account runs.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_codex_accounts(monkeypatch)
        seen: List[str] = []

        def fake_run(argv, **kwargs):
            seen.append(kwargs["env"].get("OPENAI_API_KEY", ""))
            if len(seen) == 1:
                return subprocess.CompletedProcess(argv, 0, stdout="   \n", stderr="")
            return subprocess.CompletedProcess(argv, 0, stdout="real answer\n", stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("do it") == "real answer"
        assert seen == ["one", "two"], "the second attempt must use the second account"

    def test_print_timeout_text_rotates_to_the_next_account(self, monkeypatch):
        """`--print-timeout` wording makes a 0-exit attempt count as failed too.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_codex_accounts(monkeypatch)
        seen: List[str] = []

        def fake_run(argv, **kwargs):
            seen.append(kwargs["env"].get("OPENAI_API_KEY", ""))
            if len(seen) == 1:
                return subprocess.CompletedProcess(
                    argv, 0, stdout="", stderr="print timeout after 5m0s"
                )
            return subprocess.CompletedProcess(argv, 0, stdout="done\n", stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("do it") == "done"
        assert seen == ["one", "two"]

    def test_all_empty_raises_and_posts_a_notice_not_a_header_only_shell(self, monkeypatch, capsys):
        """Nothing usable anywhere must fail the run, with a real notice, never an empty shell.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
            capsys: Pytest capture fixture.
        """
        self._two_codex_accounts(monkeypatch)
        posted: List[str] = []

        def fake_run(argv, **kwargs):
            return subprocess.CompletedProcess(argv, 0, stdout="", stderr="")

        def fake_gh(args, repo=None):
            if args[:2] in (["issue", "comment"], ["pr", "comment"]):
                posted.append(args[args.index("--body") + 1])
            return ""

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        monkeypatch.setattr(agent_runner, "run_gh", fake_gh)
        ctx = {"issue_number": 42, "repo": "marius-patrik/DarkFactory"}
        with pytest.raises(RuntimeError, match="No usable agent output"):
            agent_runner.run_agent_prompt("do it", checkpoint_context=ctx)
        assert posted, "a failure notice must be posted where the empty shell would have been"
        for body in posted:
            assert "### DarkFactory Agent Execution Error" in body
            _, _, after = body.partition("### DarkFactory Agent Execution Error")
            assert after.strip(), f"header-only body posted: {body!r}"
        err = capsys.readouterr().err
        assert "No usable agent output" in err

    def test_a_handler_posts_no_empty_shell_comment(self, monkeypatch):
        """The interpret handler used to post the header-only shell; now nothing empty is posted.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_codex_accounts(monkeypatch)
        posted: List[str] = []

        def fake_run(argv, **kwargs):
            return subprocess.CompletedProcess(argv, 0, stdout="", stderr="")

        def fake_gh(args, repo=None):
            if args[0:2] == ["issue", "comment"]:
                posted.append(args[args.index("--body") + 1])
                return ""
            return json.dumps({"title": "T", "body": "B", "labels": []})

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        monkeypatch.setattr(agent_runner, "run_gh", fake_gh)
        with pytest.raises(RuntimeError):
            agent_runner.handle_interpret(42, "marius-patrik/DarkFactory")
        assert posted, "the failure notice must have been posted"
        assert "### DarkFactory Agent Response" not in posted[0]
        assert "### DarkFactory Agent Execution Error" in posted[0]

    def test_normal_output_is_returned_unchanged(self, monkeypatch):
        """Real agent text must pass through exactly as before.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_codex_accounts(monkeypatch)
        calls: List[int] = []

        def fake_run(argv, **kwargs):
            calls.append(1)
            return subprocess.CompletedProcess(
                argv, 0, stdout="  answer with whitespace  \n", stderr=""
            )

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("do it") == "answer with whitespace"
        assert len(calls) == 1

    def test_answer_discussing_timeouts_is_not_mistaken_for_a_print_timeout(self, monkeypatch):
        """Timeout wording in the agent's own answer (stdout) must not rotate the attempt away.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_codex_accounts(monkeypatch)
        calls: List[int] = []
        answer = "The print timeout is too short: the request timed out before the response."

        def fake_run(argv, **kwargs):
            calls.append(1)
            return subprocess.CompletedProcess(argv, 0, stdout=answer, stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("do it") == answer
        assert len(calls) == 1


class TestAnswersAboutQuotaArePosted:
    """Only the runner's own exhaustion notice means "out of quota"; an answer may discuss quota."""

    ANSWER = (
        "### 1. Verbatim Request Summary\n"
        "Classify opencode `429 Too Many Requests` and rate limit output as quota exhausted, "
        "so the chain moves on when the daily limit is reached."
    )

    def _issue_view(self):
        return json.dumps({"title": "Request: rotate on rate limits", "body": "", "labels": []})

    def _run(self, monkeypatch, handler, result):
        posted = []
        module = agent_runner_module()

        def fake_gh(args, repo=None, **kwargs):
            if args[:2] == ["issue", "view"]:
                return self._issue_view()
            if args[:2] in (["issue", "comment"], ["pr", "comment"]):
                posted.append(args[args.index("--body") + 1])
            return ""

        monkeypatch.setattr(module, "run_gh", fake_gh)
        monkeypatch.setattr(module, "try_gh", lambda *a, **k: "")
        monkeypatch.setattr(module, "run_agent_prompt", lambda *a, **k: result)
        handler(module)
        return posted

    def test_an_interpretation_that_discusses_quota_is_posted(self, monkeypatch):
        """Request #220 asked for rate-limit handling; its interpretation was dropped silently."""
        posted = self._run(monkeypatch, lambda m: m.handle_interpret(220, REPO_SLUG), self.ANSWER)
        assert len(posted) == 1 and self.ANSWER in posted[0]

    def test_a_response_that_discusses_quota_is_posted(self, monkeypatch):
        posted = self._run(
            monkeypatch, lambda m: m.handle_respond(220, "what about 429s?", REPO_SLUG), self.ANSWER
        )
        assert len(posted) == 1 and self.ANSWER in posted[0]

    def test_the_exhaustion_notice_still_posts_nothing(self, monkeypatch):
        """Exhaustion already checkpointed and labelled the issue Blocked inside the runner."""
        notice = agent_runner.QUOTA_EXHAUSTED_NOTICE + " across every harness and model (agy): 429"
        posted = self._run(monkeypatch, lambda m: m.handle_interpret(220, REPO_SLUG), notice)
        assert posted == []

    def test_every_caller_tests_the_notice_not_the_wording(self):
        """Callers that match quota wording on an answer drop every answer that mentions quota."""
        source = _read_runner_source()
        callers = [
            line.strip()
            for line in source.split("\n")
            if "is_quota_exhausted(" in line and "def is_quota_exhausted" not in line
        ]
        assert callers == [
            "exhausted = is_quota_exhausted(detail)",
            "short_quota = is_quota_exhausted(output)",
            "if is_quota_exhausted(combined):",
        ], callers


class TestPlanAlignmentStatus:
    """Alignment success means ready for review, not finished."""

    def test_alignment_success_leaves_entities_in_progress(self, monkeypatch):
        """Only merge/close paths may set Done; a matching plan stays In Progress."""
        module = agent_runner_module()
        statuses = []

        def fake_gh(args, repo=None):
            joined = " ".join(str(a) for a in args)
            if "pr diff" in joined:
                return "diff --git a/x b/x\n"
            if "issue view" in joined:
                return json.dumps({"title": "Plan", "body": "Do the thing", "comments": []})
            return ""

        monkeypatch.setattr(module, "run_gh", fake_gh)
        monkeypatch.setattr(
            module, "run_agent_prompt", lambda *a, **k: "MATCHES_PLAN_YES\nLooks good."
        )
        monkeypatch.setattr(module, "is_quota_exhausted", lambda *_a, **_k: False)
        monkeypatch.setattr(module, "clear_checkpoint", lambda **_k: None)
        monkeypatch.setattr(
            module,
            "unblock_entity",
            lambda number, repo, is_pr=False, target_status="In Progress", **_k: statuses.append(
                (number, is_pr, target_status)
            ),
        )

        module.handle_plan_alignment(10, 20, 30, "o/r")

        assert statuses == [
            (10, True, "In Progress"),
            (20, False, "In Progress"),
            (30, False, "In Progress"),
        ]


def _issue_comment_payload(
    body,
    login="marius-patrik",
    assoc="OWNER",
    user_type="User",
    labels=("Request",),
    issue_author="marius-patrik",
    number=91,
    is_pr=False,
):
    """Builds an `issue_comment: created` payload.

    Args:
        body: Comment body.
        login: Comment author login.
        assoc: Comment `author_association`.
        user_type: Comment author `user.type`.
        labels: Issue labels.
        issue_author: Issue author login.
        number: Issue number.
        is_pr: Whether the issue is a pull request.

    Returns:
        The webhook payload.
    """
    issue = {
        "number": number,
        "labels": [{"name": name} for name in labels],
        "user": {"login": issue_author},
    }
    if is_pr:
        issue["pull_request"] = {"url": "https://github.com/o/r/pull/91"}
    return {
        "action": "created",
        "comment": {
            "body": body,
            "user": {"login": login, "type": user_type},
            "author_association": assoc,
        },
        "issue": issue,
        "repository": {"full_name": REPO_SLUG},
    }


def _dispatch_issue_comment(monkeypatch, tmp_path, payload, plan_exists=False):
    """Dispatches a payload with every stage handler replaced by a recorder.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided empty directory.
        payload: Webhook payload.
        plan_exists: What `has_plan` reports.

    Returns:
        Dict of recorded calls per handler name.
    """
    module = agent_runner_module()
    calls: dict = {
        "interpret": [],
        "plan": [],
        "implement": [],
        "self_review": [],
        "respond": [],
        "unblock": [],
        "gh": [],
    }
    monkeypatch.setattr(
        module,
        "handle_interpret",
        lambda n, r, feedback="": calls["interpret"].append((n, feedback)),
    )
    monkeypatch.setattr(
        module,
        "handle_plan",
        lambda req, plan, r, feedback="": calls["plan"].append((req, plan, feedback)),
    )
    monkeypatch.setattr(module, "handle_implement", lambda *a: calls["implement"].append(a))
    monkeypatch.setattr(module, "start_self_review", lambda *a: calls["self_review"].append(a))
    monkeypatch.setattr(module, "handle_respond", lambda *a, **k: calls["respond"].append((a, k)))
    monkeypatch.setattr(module, "unblock_entity", lambda *a, **k: calls["unblock"].append((a, k)))
    monkeypatch.setattr(module, "load_checkpoint", lambda **k: None)
    monkeypatch.setattr(module, "has_plan", lambda n, r: plan_exists)
    monkeypatch.setattr(module, "run_gh", lambda *a, **k: (calls["gh"].append(a), "{}")[1])
    path = tmp_path / "event.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    module.dispatch_event(str(path), "issue_comment")
    return calls


class TestPipelineFailureComments:
    """Comments on `pipeline-failure` issues must not run the agent."""

    def test_an_ordinary_comment_runs_nothing(self, monkeypatch, tmp_path):
        """No LLM call, no gate, no board move — the report is left alone."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload("what happened here?", labels=("pipeline-failure",)),
        )
        assert calls["respond"] == []
        assert calls["interpret"] == []
        assert calls["plan"] == []
        assert calls["implement"] == []
        assert calls["unblock"] == []

    def test_an_approval_shaped_comment_runs_nothing(self, monkeypatch, tmp_path):
        """`approve` on a failure report is not a gate; the gates live elsewhere."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload("approve", labels=("pipeline-failure",)),
        )
        assert calls["respond"] == []
        assert calls["plan"] == []
        assert calls["implement"] == []

    def test_only_a_resume_command_is_processed(self, monkeypatch, tmp_path):
        """The resume escape hatch still answers instead of skipping."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload("/df resume", labels=("pipeline-failure",)),
        )
        assert len(calls["respond"]) == 1


class TestRejectRoutesBack:
    """`reject`/`revise` re-runs the same stage with the comment as feedback."""

    def test_reject_on_an_interpretation_reruns_interpretation(self, monkeypatch, tmp_path):
        """No plan yet means the interpretation stage owns the rejection."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload("/df reject use bun, not npm"),
        )
        assert len(calls["interpret"]) == 1
        _num, feedback = calls["interpret"][0]
        assert "use bun, not npm" in feedback
        assert calls["plan"] == []
        assert calls["implement"] == []
        assert calls["unblock"] == [], "a rejection unblocks nothing"
        assert not any("close" in args for args in calls["gh"]), "a rejection closes nothing"

    def test_reject_on_a_plan_reruns_planning(self, monkeypatch, tmp_path):
        """A plan exists means the plan stage owns the rejection."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload("/revise the scope is wrong"),
            plan_exists=True,
        )
        assert len(calls["plan"]) == 1
        _req, _plan, feedback = calls["plan"][0]
        assert "the scope is wrong" in feedback
        assert calls["implement"] == []
        assert calls["interpret"] == []

    def test_reject_on_a_pull_request_is_a_change_request(self, monkeypatch, tmp_path):
        """On a PR there is no stage to re-run: the agent answers, nothing merges."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload("/df reject needs tests", labels=(), is_pr=True),
        )
        assert len(calls["respond"]) == 1
        assert calls["self_review"] == []
        assert calls["unblock"] == [], "a change request arms no merge"

    def test_reject_is_never_an_approval(self, monkeypatch, tmp_path):
        """Even the strict `/df reject` must not advance either gate."""
        calls = _dispatch_issue_comment(
            monkeypatch, tmp_path, _issue_comment_payload("/df reject"), plan_exists=True
        )
        assert calls["implement"] == []


class TestWhoMayApprove:
    """Owner decision 9c: the Request author or OWNER/MEMBER/COLLABORATOR, never a bot."""

    def test_a_strangers_approve_is_feedback(self, monkeypatch, tmp_path):
        """It is answered, but the plan gate does not move."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload("approve", login="stranger", assoc="CONTRIBUTOR"),
        )
        assert len(calls["respond"]) == 1
        assert calls["plan"] == []
        assert calls["implement"] == []

    def test_a_strangers_strict_command_is_feedback(self, monkeypatch, tmp_path):
        """The strict grammar does not promote strangers either."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload("/df approve", login="stranger", assoc="NONE"),
        )
        assert len(calls["respond"]) == 1
        assert calls["plan"] == []

    def test_the_request_author_may_approve(self, monkeypatch, tmp_path):
        """A CONTRIBUTOR who filed the request approves their own gate."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload(
                "/df approve", login="author", assoc="CONTRIBUTOR", issue_author="author"
            ),
        )
        assert len(calls["plan"]) == 1
        assert calls["respond"] == []

    def test_a_collaborator_may_approve(self, monkeypatch, tmp_path):
        """Role-based approval without authorship."""
        calls = _dispatch_issue_comment(
            monkeypatch,
            tmp_path,
            _issue_comment_payload(
                "lgtm", login="helper", assoc="COLLABORATOR", issue_author="someone-else"
            ),
        )
        assert len(calls["plan"]) == 1


class TestCommandHint:
    """Free text mentioning a command word earns at most one hint comment."""

    def _dispatch_with_comments(self, monkeypatch, tmp_path, body, existing):
        """Dispatches with preset existing comments, recording posted bodies.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
            tmp_path: Pytest-provided empty directory.
            body: New comment body.
            existing: Bodies already on the issue.

        Returns:
            Tuple of (calls, posted bodies).
        """
        module = agent_runner_module()
        posted = []
        calls = {"respond": []}
        monkeypatch.setattr(module, "handle_respond", lambda *a, **k: calls["respond"].append(a))

        def fake_gh(args, repo=None):
            if args[:2] == ["issue", "comment"]:
                posted.append(args[args.index("--body") + 1])
                return ""
            return json.dumps({"comments": [{"body": b} for b in existing]})

        monkeypatch.setattr(module, "run_gh", fake_gh)
        path = tmp_path / "event.json"
        path.write_text(json.dumps(_issue_comment_payload(body)), encoding="utf-8")
        module.dispatch_event(str(path), "issue_comment")
        return calls, posted

    def test_a_mention_posts_the_hint_and_still_answers(self, monkeypatch, tmp_path):
        """The mention is feedback (answered), and the grammar gets one explanation."""
        calls, posted = self._dispatch_with_comments(
            monkeypatch, tmp_path, "I do not approve yet", []
        )
        assert len(calls["respond"]) == 1
        assert len(posted) == 1
        assert "<!-- darkfactory-command-hint -->" in posted[0]
        assert "/df approve" in posted[0]

    def test_the_hint_is_posted_at_most_once(self, monkeypatch, tmp_path):
        """A second mention finds the marker and stays silent."""
        _calls, posted = self._dispatch_with_comments(
            monkeypatch,
            tmp_path,
            "I do not approve yet",
            ["<!-- darkfactory-command-hint -->\nuse /df approve"],
        )
        assert posted == []

    def test_a_real_command_posts_no_hint(self, monkeypatch, tmp_path):
        """Commands act; they need no explanation."""
        module = agent_runner_module()
        posted = []
        monkeypatch.setattr(module, "handle_plan", lambda *a, **k: None)
        monkeypatch.setattr(module, "unblock_entity", lambda *a, **k: None)
        monkeypatch.setattr(module, "load_checkpoint", lambda **k: None)
        monkeypatch.setattr(module, "has_plan", lambda n, r: False)

        def fake_gh(args, repo=None):
            if args[:2] == ["issue", "comment"]:
                posted.append(args[args.index("--body") + 1])
                return ""
            return json.dumps({"comments": []})

        monkeypatch.setattr(module, "run_gh", fake_gh)
        path = tmp_path / "event.json"
        path.write_text(json.dumps(_issue_comment_payload("/df approve")), encoding="utf-8")
        module.dispatch_event(str(path), "issue_comment")
        assert posted == []


class TestStageTimeBudgets:
    """A plan or review explores the repository; five minutes timed out on every agy attempt."""

    def _capture(self, monkeypatch, handler):
        seen = {}
        module = agent_runner_module()

        def fake_prompt(prompt, timeout="5m0s", **kwargs):
            seen["timeout"] = timeout
            return "answer"

        monkeypatch.setattr(module, "run_agent_prompt", fake_prompt)
        monkeypatch.setattr(
            module,
            "run_gh",
            lambda args, repo=None, **k: (
                json.dumps({"title": "t", "body": "b", "labels": []})
                if args[:2] == ["issue", "view"]
                else ""
            ),
        )
        monkeypatch.setattr(module, "try_gh", lambda *a, **k: "")
        handler(module)
        return seen.get("timeout")

    def test_the_plan_gets_the_long_budget(self, monkeypatch):
        """Plan run 34833536164 (#227): four agy attempts hit "print timeout after 5m0s"."""
        timeout = self._capture(monkeypatch, lambda m: m.handle_plan(227, 227, REPO_SLUG))
        assert timeout == agent_runner.PLAN_TIMEOUT
        assert agent_runner.PLAN_TIMEOUT != "5m0s"


class TestAuthFailuresRotate:
    """A stale secret on one harness must not stop a healthy chain (F3 item 1)."""

    @pytest.mark.parametrize(
        "message",
        [
            "Error 401: invalid api key",
            "claude: 401 Unauthorized",
            "HTTP 403 forbidden",
            "invalid api key provided",
            "unauthorized: no valid credential",
            "OAuth token expired token, please re-login",
            "invalid_grant: refresh token expired",
            "Invalid API key for model opus",
        ],
    )
    def test_auth_failures_detected(self, message: str):
        """Auth errors must be recognised so the chain rotates past the stale secret.

        Args:
            message: Provider error text.
        """
        assert agent_runner.is_auth_failure(message)

    @pytest.mark.parametrize(
        "message",
        [
            "compilation failed: expected `;`",
            "rate limit exceeded, retry later",
            "quota exhausted for this model",
            "",
        ],
    )
    def test_non_auth_errors_not_misdetected(self, message: str):
        """Quota wording is quota, build failures are bugs; neither is an auth failure.

        Args:
            message: Non-auth error text.
        """
        assert not agent_runner.is_auth_failure(message)

    def _two_claude_accounts(self, monkeypatch, secret="supersecret-token-value"):
        """Puts two Claude accounts in the environment and pretends the binary exists.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
            secret: First account credential value, long enough to be redacted.
        """
        monkeypatch.setenv("AGENT_HARNESS_CHAIN", "claude")
        monkeypatch.delenv("AGENT_HARNESS_CONFIG", raising=False)
        monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
        for name in harnesses.REGISTRY["claude"].auth.secret_names():
            monkeypatch.delenv(name, raising=False)
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN", secret)
        monkeypatch.setenv("CLAUDE_CODE_OAUTH_TOKEN_2", "second-account-token-value")

    def test_auth_failure_rotates_to_the_next_account(self, monkeypatch):
        """A 401 on the first account must try the second, without sleeping.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_claude_accounts(monkeypatch)
        slept: List[float] = []
        monkeypatch.setattr(agent_runner.time, "sleep", lambda s: slept.append(s))
        seen: List[str] = []

        def fake_run(argv, **kwargs):
            seen.append(kwargs["env"].get("CLAUDE_CODE_OAUTH_TOKEN", ""))
            if len(seen) == 1:
                raise subprocess.CalledProcessError(1, argv, stderr="401 invalid api key")
            return subprocess.CompletedProcess(argv, 0, stdout="done", stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("do it") == "done"
        assert seen == ["supersecret-token-value", "second-account-token-value"]
        assert slept == []

    def test_auth_rotation_log_names_harness_not_credential(self, monkeypatch, capsys):
        """The log says which harness/account failed; the credential value never appears.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
            capsys: Pytest capture fixture.
        """
        self._two_claude_accounts(monkeypatch)

        def fake_run(argv, **kwargs):
            raise subprocess.CalledProcessError(
                1, argv, stderr="401 invalid api key: supersecret-token-value"
            )

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        result = agent_runner.run_agent_prompt("do it")
        assert "[DarkFactory Agent Execution Error]" in result
        err = capsys.readouterr().err
        assert "claude" in err
        assert "supersecret-token-value" not in err

    def test_auth_everywhere_is_an_error_not_a_quota_block(self, monkeypatch):
        """All-stale credentials must surface as an error, never a Blocked quota notice.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_claude_accounts(monkeypatch)
        checkpoints: List[int] = []

        def fake_run(argv, **kwargs):
            raise subprocess.CalledProcessError(1, argv, stderr="401 Unauthorized")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        monkeypatch.setattr(
            agent_runner, "checkpoint_and_notify_exhaustion", lambda **k: checkpoints.append(1)
        )
        result = agent_runner.run_agent_prompt("do it")
        assert result.startswith("[DarkFactory Agent Execution Error]")
        assert not result.startswith(agent_runner.QUOTA_EXHAUSTED_NOTICE)
        assert checkpoints == []

    def test_quota_wording_on_stdout_with_empty_output_is_quota(self, monkeypatch):
        """Exhaustion reported on stdout with no output must Block, not raise.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("AGENT_HARNESS_CHAIN", "codex")
        monkeypatch.delenv("AGENT_HARNESS_CONFIG", raising=False)
        monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
        for name in harnesses.REGISTRY["codex"].auth.secret_names():
            monkeypatch.delenv(name, raising=False)
        monkeypatch.setenv("OPENAI_API_KEY", "one")
        checkpoints: List[int] = []
        monkeypatch.setattr(
            agent_runner, "checkpoint_and_notify_exhaustion", lambda **k: checkpoints.append(1)
        )

        def fake_run(argv, **kwargs):
            return subprocess.CompletedProcess(
                argv, 0, stdout="quota exceeded for this model", stderr=""
            )

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        result = agent_runner.run_agent_prompt(
            "do it",
            checkpoint_context={"issue_number": 1, "repo": "marius-patrik/DarkFactory"},
        )
        assert result.startswith(agent_runner.QUOTA_EXHAUSTED_NOTICE)
        assert checkpoints == [1]

    def test_auth_wording_on_stdout_with_empty_output_rotates(self, monkeypatch):
        """Auth reported on stdout with no output must rotate, not raise RuntimeError.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._two_claude_accounts(monkeypatch)
        seen: List[str] = []

        def fake_run(argv, **kwargs):
            seen.append(kwargs["env"].get("CLAUDE_CODE_OAUTH_TOKEN", ""))
            if len(seen) == 1:
                return subprocess.CompletedProcess(argv, 0, stdout="401 invalid api key", stderr="")
            return subprocess.CompletedProcess(argv, 0, stdout="done", stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("do it") == "done"
        assert seen == ["supersecret-token-value", "second-account-token-value"]


class TestExecutionErrorsFailTheRun:
    """A posted Execution Error must exit non-zero so report-failure fires (F3 item 2)."""

    def _posted_after(self, monkeypatch, prompt_result, handler):
        posted: List[str] = []

        def fake_gh(args, repo=None, **kwargs):
            if args[:2] in (["issue", "comment"], ["pr", "comment"]):
                posted.append(args[args.index("--body") + 1])
                return ""
            return json.dumps({"title": "Request: x", "body": "y", "labels": []})

        monkeypatch.setattr(agent_runner, "run_gh", fake_gh)
        monkeypatch.setattr(agent_runner, "try_gh", lambda *a, **k: "")
        monkeypatch.setattr(agent_runner, "run_agent_prompt", lambda *a, **k: prompt_result)
        return posted, handler

    def test_interpret_error_posts_then_exits(self, monkeypatch):
        """An interpret failure must be visible as a failed run, not a green one.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        posted, _ = self._posted_after(
            monkeypatch,
            "[DarkFactory Agent Execution Error]: boom",
            None,
        )
        with pytest.raises(SystemExit) as exc:
            agent_runner.handle_interpret(7, "marius-patrik/DarkFactory")
        assert exc.value.code != 0
        assert len(posted) == 1 and "Execution Error" in posted[0]

    def test_plan_error_posts_then_exits(self, monkeypatch):
        """A plan failure must be visible as a failed run, not a green one.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._posted_after(
            monkeypatch,
            "[DarkFactory Agent Execution Error]: boom",
            None,
        )
        with pytest.raises(SystemExit) as exc:
            agent_runner.handle_plan(7, 7, "marius-patrik/DarkFactory")
        assert exc.value.code != 0

    def test_respond_error_posts_then_exits(self, monkeypatch):
        """A respond failure must be visible as a failed run, not a green one.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        self._posted_after(
            monkeypatch,
            "[DarkFactory Agent Execution Error]: boom",
            None,
        )
        with pytest.raises(SystemExit) as exc:
            agent_runner.handle_respond(7, "hello?", "marius-patrik/DarkFactory")
        assert exc.value.code != 0

    def test_quota_notice_still_returns_normally(self, monkeypatch):
        """Quota exhaustion keeps today's behaviour: checkpointed, Blocked, run stays green.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        notice = agent_runner.QUOTA_EXHAUSTED_NOTICE + " across every harness (claude): 429"
        posted: List[str] = []

        def fake_gh(args, repo=None, **kwargs):
            if args[:2] in (["issue", "comment"], ["pr", "comment"]):
                posted.append(args[args.index("--body") + 1])
            return json.dumps({"title": "Request: x", "body": "y", "labels": []})

        monkeypatch.setattr(agent_runner, "run_gh", fake_gh)
        monkeypatch.setattr(agent_runner, "run_agent_prompt", lambda *a, **k: notice)
        assert agent_runner.handle_plan(7, 7, "marius-patrik/DarkFactory") is None
        assert posted == []


class TestFileLinksBecomeRepoLinks:
    """Interpretation comments must not link files as file:/// URLs (F3 item 5)."""

    def test_file_url_becomes_a_repo_blob_link(self):
        """A file:// URL turns into a GitHub blob link for the file path."""
        out = agent_runner.rewrite_file_links(
            "see file:///harnesses.py for details",
            repo="marius-patrik/DarkFactory",
            branch="darkfactory",
        )
        assert "file://" not in out
        assert "https://github.com/marius-patrik/DarkFactory/blob/darkfactory/harnesses.py" in out

    def test_file_url_without_repo_becomes_a_plain_path(self):
        """Without a repo slug there is no link to build, so a plain code path remains."""
        out = agent_runner.rewrite_file_links("see file:///.github/scripts/harnesses.py")
        assert "file://" not in out
        assert ".github/scripts/harnesses.py" in out

    def test_plain_text_passes_through_unchanged(self):
        """Text without file:// URLs is returned verbatim."""
        assert agent_runner.rewrite_file_links("no links here") == "no links here"


class TestTheAnswerIsTheResult:
    """The pipeline posts or parses the final message; nobody can answer a question mid-run."""

    def test_every_harness_receives_the_answer_contract(self, monkeypatch, tmp_path):
        """#227's plan was written to /tmp inside the container and the comment only asked
        "Want me to post this as a comment?" - the plan itself never reached the issue.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
            tmp_path: Temporary directory.
        """
        monkeypatch.setenv("HOME", str(tmp_path))
        monkeypatch.setenv("AGENT_HARNESS_CHAIN", "codex")
        monkeypatch.delenv("AGENT_HARNESS_CONFIG", raising=False)
        monkeypatch.setenv("OPENAI_API_KEY", "key")
        monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
        seen = []

        def fake_run(argv, **kwargs):
            seen.append(" ".join(argv))
            return subprocess.CompletedProcess(argv, 0, stdout="the plan\n", stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("Draft a plan") == "the plan"
        assert "Draft a plan" in seen[0]
        assert agent_runner.ANSWER_CONTRACT in seen[0]


class TestDeterministicScopeCheck:
    """Owner decision 9a: compare PR changed files with approved plan names and revert out-of-scope files."""

    def test_parse_plan_files_extracts_paths(self):
        module = agent_runner_module()
        plan_text = (
            "### Implementation Plan\n\n"
            "### Scope\n"
            "- `.github/scripts/commands.py`\n"
            "- `tests/test_commands.py`\n"
            "Also update [agent runner](https://github.com/marius-patrik/darkfactory/blob/darkfactory/.github/scripts/agent_runner.py).\n"
        )
        files = module.parse_plan_files(plan_text)
        assert ".github/scripts/commands.py" in files or "commands.py" in files
        assert "tests/test_commands.py" in files or "test_commands.py" in files
        assert ".github/scripts/agent_runner.py" in files or "agent_runner.py" in files

    def test_check_scope_detects_out_of_scope_files(self):
        module = agent_runner_module()
        plan_files = {".github/scripts/commands.py", "tests/test_commands.py"}
        changed = [".github/scripts/commands.py", ".github/scripts/project_automation.py"]
        in_scope, out_of_scope = module.check_scope(changed, plan_files)
        assert in_scope == [".github/scripts/commands.py"]
        assert out_of_scope == [".github/scripts/project_automation.py"]

    def test_behavioral_plan_references_do_not_create_a_file_allowlist(self):
        module = agent_runner_module()
        plan_text = (
            "## Scope\n"
            "Build the shared `@darkfactory/web` shell using current `repo.df` state.\n"
            "Inspect `packages/web` and choose the concrete files from the current tree.\n"
        )
        assert module.parse_plan_files(plan_text)
        assert module.parse_explicit_plan_files(plan_text) == set()

    def test_explicit_file_scope_creates_the_only_deterministic_allowlist(self):
        module = agent_runner_module()
        plan_text = (
            "## Scope\n"
            "Implement the approved behavior using current owners.\n\n"
            "## File Scope\n"
            "- `.github/scripts/agent_runner.py`\n"
            "- `tests/test_agent_runner.py`\n\n"
            "## Verification\n"
            "Run the pipeline tests.\n"
        )
        assert module.parse_explicit_plan_files(plan_text) == {
            ".github/scripts/agent_runner.py",
            "tests/test_agent_runner.py",
        }


class TestDeterministicPrBody:
    """Build PR body deterministically from plan, diff --stat, and test result."""

    def test_pr_body_built_from_plan_summary_diff_stat_and_test_result(self):
        module = agent_runner_module()
        plan_title = "Plan: Update gate commands"
        plan_text = (
            "### Implementation Plan\n\n"
            "### Scope\n"
            "Update commands to include /df prefixes.\n\n"
            "### Verification\nRun pytest.\n"
        )
        diff_stat = " .github/scripts/commands.py | 10 +++++-----\n 1 file changed"
        test_cmd = "python3 -m pytest tests/ -q"
        test_result = "856 passed, 8 skipped in 9.74s"
        agent_notes = "Now I need to add tests... Wait, let's first check..."

        body = module.build_pr_body(
            plan_title=plan_title,
            plan_text=plan_text,
            request_number=267,
            plan_number=267,
            diff_stat=diff_stat,
            test_command=test_cmd,
            test_result_line=test_result,
            agent_notes=agent_notes,
        )

        assert "## Summary" in body
        assert "Update commands to include /df prefixes" in body
        assert "## Changed Files" in body
        assert ".github/scripts/commands.py" in body
        assert "python3 -m pytest tests/ -q" in body
        assert "856 passed, 8 skipped in 9.74s" in body
        assert "Closes #267" in body
        # Agent notes must only appear in a details block
        assert "<details>" in body
        assert "<summary>Agent notes</summary>" in body
        assert "Now I need to add tests..." in body
        # Summary must NOT have the raw agent notes
        assert body.split("## Changed Files")[0].find("Now I need to add tests") == -1


class TestScopeCheckKeepsTestsAndVaguePlans:
    """Tests accompany every change (rule 1), and a plan that names no files cannot define scope."""

    def test_new_test_files_are_never_out_of_scope(self):
        """#267's plan named tests/test_commands.py; the implementation added tests/test_footers.py."""
        in_scope, out = agent_runner.check_scope(
            [".github/scripts/commands.py", "tests/test_footers.py", "harness/test/router.test.ts"],
            {".github/scripts/commands.py", "tests/test_commands.py"},
        )
        assert out == []
        assert "tests/test_footers.py" in in_scope

    def test_a_plan_without_file_paths_reverts_nothing(self):
        in_scope, out = agent_runner.check_scope([".github/scripts/project_automation.py"], set())
        assert out == []
        assert in_scope == [".github/scripts/project_automation.py"]

    def test_an_unrelated_production_file_is_still_out_of_scope(self):
        _, out = agent_runner.check_scope(
            [".github/scripts/commands.py", ".github/scripts/project_automation.py"],
            {".github/scripts/commands.py"},
        )
        assert out == [".github/scripts/project_automation.py"]


class TestSelfReviewFix:
    """Self-review fix run: parses findings, reverts out-of-scope files, fixes findings, and dispatches iteration N+1."""

    def test_run_self_review_fix_success(self, monkeypatch):
        module = agent_runner_module()
        gh_comments_posted = []
        dispatched_payloads = []
        reverted_files = []
        git_commands = []
        agent_prompts = []

        findings_comment_body = (
            "### Self-Review — iteration 1\n"
            "1. Out of scope: extra.py (not in the approved plan)\n"
            "2. Bug in auth.py: handle None case\n"
            "<!-- darkfactory-self-review iteration=1 findings=2 digest=1234abcd -->"
        )

        def fake_run_gh(args, **kwargs):
            if args[:2] == ["issue", "view"]:
                return json.dumps({"comments": [{"body": findings_comment_body}]})
            if args[:2] == ["pr", "comment"]:
                body_arg = args[args.index("--body") + 1]
                gh_comments_posted.append(body_arg)
                return ""
            return ""

        def fake_revert(files, base, cwd):
            reverted_files.extend(files)
            return "sha1234567"

        def fake_dispatch_stage(repo, payload):
            dispatched_payloads.append(payload)

        def fake_agent_prompt(prompt, **kwargs):
            agent_prompts.append(prompt)
            return "Fixed the bug"

        def fake_run_git(args, **kwargs):
            git_commands.append(" ".join(args))
            if args[:2] == ["status", "--porcelain"]:
                return "M auth.py"
            return ""

        monkeypatch.setattr(module, "run_gh", fake_run_gh)
        monkeypatch.setattr(module, "revert_out_of_scope_files", fake_revert)
        monkeypatch.setattr(module, "dispatch_stage", fake_dispatch_stage)
        monkeypatch.setattr(module, "run_agent_prompt", fake_agent_prompt)
        monkeypatch.setattr(module, "run_git", fake_run_git)
        monkeypatch.setattr(module, "format_repository", lambda *a, **k: None)

        module.run_self_review_fix(
            pr_number=10, plan_number=20, request_number=30, iteration=1, repo="owner/repo"
        )

        assert reverted_files == ["extra.py"]
        assert len(agent_prompts) == 1
        assert "Bug in auth.py: handle None case" in agent_prompts[0]
        assert "Out of scope" not in agent_prompts[0]
        assert any("push origin HEAD" in cmd for cmd in git_commands)
        assert len(gh_comments_posted) == 1
        assert "### Self-Review fixes — iteration 1" in gh_comments_posted[0]
        assert "extra.py" in gh_comments_posted[0]
        assert len(dispatched_payloads) == 1
        assert dispatched_payloads[0] == {
            "stage": "self-review",
            "pr": 10,
            "plan": 20,
            "request": 30,
            "iteration": 2,
        }

    def test_run_self_review_fix_missing_comment_blocks(self, monkeypatch):
        module = agent_runner_module()
        blocked_calls = []
        dispatched_payloads = []

        def fake_run_gh(args, **kwargs):
            if args[:2] == ["issue", "view"]:
                return json.dumps({"comments": [{"body": "Some unrelated comment"}]})
            return ""

        monkeypatch.setattr(module, "run_gh", fake_run_gh)
        monkeypatch.setattr(
            module, "block_entity", lambda num, repo, is_pr: blocked_calls.append((num, is_pr))
        )
        monkeypatch.setattr(
            module, "dispatch_stage", lambda repo, payload: dispatched_payloads.append(payload)
        )

        module.run_self_review_fix(
            pr_number=10, plan_number=20, request_number=30, iteration=1, repo="owner/repo"
        )

        assert (10, True) in blocked_calls
        assert (30, False) in blocked_calls
        assert dispatched_payloads == []

    def test_run_self_review_fix_git_error_is_reported_and_blocks(self, monkeypatch):
        """A failed commit of review fixes must not stall the PR silently."""
        module = agent_runner_module()
        comments, blocked, dispatched = [], [], []
        findings = (
            "### Self-Review — iteration 1\n1. Bug in auth.py: handle None case\n"
            "<!-- darkfactory-self-review iteration=1 findings=1 digest=1234abcd -->"
        )

        def fake_run_gh(args, **kwargs):
            if args[:2] == ["issue", "view"]:
                return json.dumps({"comments": [{"body": findings}]})
            if args[:2] == ["pr", "comment"]:
                comments.append(args[args.index("--body") + 1])
            return ""

        def fake_run_git(args, **kwargs):
            if args[:1] == ["commit"]:
                raise subprocess.CalledProcessError(
                    128, ["git"] + args, stderr="Author identity unknown"
                )
            return "M auth.py" if args[:2] == ["status", "--porcelain"] else ""

        monkeypatch.setattr(module, "run_gh", fake_run_gh)
        monkeypatch.setattr(module, "run_git", fake_run_git)
        monkeypatch.setattr(module, "run_agent_prompt", lambda prompt, **k: "Fixed the bug")
        monkeypatch.setattr(module, "format_repository", lambda *a, **k: None)
        monkeypatch.setattr(module, "block_entity", lambda num, **k: blocked.append(num))
        monkeypatch.setattr(
            module, "dispatch_stage", lambda repo, payload: dispatched.append(payload)
        )

        module.run_self_review_fix(
            pr_number=10, plan_number=20, request_number=30, iteration=1, repo="owner/repo"
        )

        assert blocked == [10] and dispatched == []
        assert len(comments) == 1 and "### Self-Review Fix Error (Iteration 1)" in comments[0]
        assert "Author identity unknown" in comments[0]

    def test_run_self_review_fix_reads_latest_matching_iteration(self, monkeypatch):
        module = agent_runner_module()
        dispatched_payloads = []
        agent_prompts = []

        # Previous iteration comment and latest iteration 2 comment
        c1 = (
            "### Self-Review — iteration 1\n"
            "1. Old bug\n"
            "<!-- darkfactory-self-review iteration=1 findings=1 digest=1111aaaa -->"
        )
        c2 = (
            "### Self-Review — iteration 2\n"
            "1. New finding in parser.py\n"
            "<!-- darkfactory-self-review iteration=2 findings=1 digest=2222bbbb -->"
        )

        def fake_run_gh(args, **kwargs):
            if args[:2] == ["issue", "view"]:
                return json.dumps({"comments": [{"body": c1}, {"body": c2}]})
            return ""

        monkeypatch.setattr(module, "run_gh", fake_run_gh)
        monkeypatch.setattr(
            module, "dispatch_stage", lambda repo, payload: dispatched_payloads.append(payload)
        )
        monkeypatch.setattr(
            module,
            "run_agent_prompt",
            lambda prompt, **kwargs: (agent_prompts.append(prompt), "done")[1],
        )
        monkeypatch.setattr(module, "run_git", lambda *a, **k: "")
        monkeypatch.setattr(module, "format_repository", lambda *a, **k: None)

        module.run_self_review_fix(
            pr_number=15, plan_number=25, request_number=35, iteration=2, repo="owner/repo"
        )

        assert len(agent_prompts) == 1
        assert "New finding in parser.py" in agent_prompts[0]
        assert "Old bug" not in agent_prompts[0]
        assert len(dispatched_payloads) == 1
        assert dispatched_payloads[0]["iteration"] == 3

    def test_run_self_review_fix_only_out_of_scope_files(self, monkeypatch):
        module = agent_runner_module()
        reverted_files = []
        dispatched_payloads = []
        agent_prompts = []

        findings_comment = (
            "### Self-Review — iteration 1\n"
            "1. Out of scope: unwanted.py (not in the approved plan)\n"
            "<!-- darkfactory-self-review iteration=1 findings=1 digest=1234abcd -->"
        )

        def fake_run_gh(args, **kwargs):
            if args[:2] == ["issue", "view"]:
                return json.dumps({"comments": [{"body": findings_comment}]})
            return ""

        def fake_revert(files, base, cwd):
            reverted_files.extend(files)
            return "sha9999"

        monkeypatch.setattr(module, "run_gh", fake_run_gh)
        monkeypatch.setattr(module, "revert_out_of_scope_files", fake_revert)
        monkeypatch.setattr(
            module, "dispatch_stage", lambda repo, payload: dispatched_payloads.append(payload)
        )
        monkeypatch.setattr(
            module, "run_agent_prompt", lambda prompt, **kwargs: agent_prompts.append(prompt)
        )

        module.run_self_review_fix(
            pr_number=10, plan_number=20, request_number=30, iteration=1, repo="owner/repo"
        )

        assert reverted_files == ["unwanted.py"]
        assert (
            agent_prompts == []
        )  # No agent prompt needed when all findings are out-of-scope files
        assert len(dispatched_payloads) == 1
        assert dispatched_payloads[0]["iteration"] == 2


class TestRunSelfReviewIterationAndFindings:
    """Tests for parse_review_findings and run_self_review_iteration."""

    def test_parse_review_findings(self):
        import agent_runner

        # Numbered multi-line items -> one finding each; 10. prefix stripped
        text1 = "10. This is finding one\n  with a second line.\n20. This is finding two."
        res1 = agent_runner.parse_review_findings(text1)
        assert res1 == ["This is finding one with a second line.", "This is finding two."]

        # Bullets without losing characters for *text/-text
        text2 = "* Bullet one\n*Bullet two\n- Bullet three\n-Bullet four"
        res2 = agent_runner.parse_review_findings(text2)
        assert res2 == ["Bullet one", "Bullet two", "Bullet three", "Bullet four"]

        # Prose -> one finding
        text3 = "This is a single prose paragraph review.\nIt has no numbered or bulleted items."
        res3 = agent_runner.parse_review_findings(text3)
        assert res3 == [
            "This is a single prose paragraph review.\nIt has no numbered or bulleted items."
        ]

        # NO_FINDINGS -> none
        text4 = "NO_FINDINGS\nEverything is clean!"
        res4 = agent_runner.parse_review_findings(text4)
        assert res4 == []

    def test_run_self_review_iteration_two_findings(self, monkeypatch):
        module = agent_runner_module()
        gh_calls = []
        dispatch_calls = []

        monkeypatch.setattr(
            module,
            "run_gh",
            lambda args, **k: gh_calls.append(args)
            or (json.dumps({"comments": []}) if args[:2] == ["issue", "view"] else "diff"),
        )
        monkeypatch.setattr(
            module, "run_agent_prompt", lambda *a, **k: "1. Finding A\n2. Finding B"
        )
        monkeypatch.setattr(module, "get_pr_changed_files", lambda *a, **k: ["file.py"])
        monkeypatch.setattr(module, "parse_plan_files", lambda *a, **k: {"file.py"})
        monkeypatch.setattr(module, "check_scope", lambda *a, **k: (["file.py"], []))
        monkeypatch.setattr(module, "default_branch", lambda *a, **k: "main")
        monkeypatch.setattr(
            module, "dispatch_stage", lambda repo, payload: dispatch_calls.append(payload)
        )

        res = module.run_self_review_iteration(
            pr_number=10, plan_number=20, request_number=30, iteration=1, repo="owner/repo"
        )

        assert res == "fix-dispatched"
        assert len(dispatch_calls) == 1
        assert dispatch_calls[0] == {
            "stage": "self-review-fix",
            "pr": 10,
            "plan": 20,
            "request": 30,
            "iteration": 1,
        }

        pr_comments = [args for args in gh_calls if args[:2] == ["pr", "comment"]]
        assert len(pr_comments) == 1
        comment_body = pr_comments[0][pr_comments[0].index("--body") + 1]
        assert "findings=2" in comment_body
        assert "1. Finding A" in comment_body
        assert "2. Finding B" in comment_body

    def test_run_self_review_iteration_clean(self, monkeypatch):
        module = agent_runner_module()
        gh_calls = []
        alignment_calls = []

        monkeypatch.setattr(
            module,
            "run_gh",
            lambda args, **k: gh_calls.append(args)
            or (json.dumps({"comments": []}) if args[:2] == ["issue", "view"] else "diff"),
        )
        monkeypatch.setattr(module, "run_agent_prompt", lambda *a, **k: "NO_FINDINGS")
        monkeypatch.setattr(module, "get_pr_changed_files", lambda *a, **k: ["file.py"])
        monkeypatch.setattr(module, "parse_plan_files", lambda *a, **k: {"file.py"})
        monkeypatch.setattr(module, "check_scope", lambda *a, **k: (["file.py"], []))
        monkeypatch.setattr(module, "default_branch", lambda *a, **k: "main")
        monkeypatch.setattr(
            module, "handle_plan_alignment", lambda *a, **k: alignment_calls.append(a)
        )

        res = module.run_self_review_iteration(
            pr_number=10, plan_number=20, request_number=30, iteration=1, repo="owner/repo"
        )

        assert res == "clean"
        assert len(alignment_calls) == 1
        assert alignment_calls[0] == (10, 20, 30, "owner/repo")

    def test_run_self_review_iteration_out_of_scope_file(self, monkeypatch):
        module = agent_runner_module()
        gh_calls = []
        dispatch_calls = []

        monkeypatch.setattr(
            module,
            "run_gh",
            lambda args, **k: gh_calls.append(args)
            or (json.dumps({"comments": []}) if args[:2] == ["issue", "view"] else "diff"),
        )
        monkeypatch.setattr(module, "run_agent_prompt", lambda *a, **k: "NO_FINDINGS")
        monkeypatch.setattr(module, "get_pr_changed_files", lambda *a, **k: ["file.py", "extra.py"])
        monkeypatch.setattr(module, "parse_plan_files", lambda *a, **k: {"file.py"})
        monkeypatch.setattr(module, "check_scope", lambda *a, **k: (["file.py"], ["extra.py"]))
        monkeypatch.setattr(module, "default_branch", lambda *a, **k: "main")
        monkeypatch.setattr(
            module, "dispatch_stage", lambda repo, payload: dispatch_calls.append(payload)
        )

        res = module.run_self_review_iteration(
            pr_number=10, plan_number=20, request_number=30, iteration=1, repo="owner/repo"
        )

        assert res == "fix-dispatched"
        assert len(dispatch_calls) == 1
        pr_comments = [args for args in gh_calls if args[:2] == ["pr", "comment"]]
        markers = [
            args
            for args in pr_comments
            if "darkfactory-self-review" in args[args.index("--body") + 1]
        ]
        assert len(markers) == 1
        assert "findings=1" in markers[0][markers[0].index("--body") + 1]

    def test_run_self_review_iteration_stuck_loop(self, monkeypatch):
        module = agent_runner_module()
        gh_calls = []
        blocked_calls = []

        c_prev = (
            "### Self-Review — iteration 1\n"
            "1. Finding A\n"
            "<!-- darkfactory-self-review iteration=1 findings=1 digest=ec7c4a513bac4eafac51797cbd5dba57638fce97 -->"
        )

        monkeypatch.setattr(
            module,
            "run_gh",
            lambda args, **k: gh_calls.append(args)
            or (
                json.dumps({"comments": [{"body": c_prev}]})
                if args[:2] == ["issue", "view"]
                else "diff"
            ),
        )
        monkeypatch.setattr(module, "run_agent_prompt", lambda *a, **k: "1. Finding A")
        monkeypatch.setattr(module, "get_pr_changed_files", lambda *a, **k: ["file.py"])
        monkeypatch.setattr(module, "parse_plan_files", lambda *a, **k: {"file.py"})
        monkeypatch.setattr(module, "check_scope", lambda *a, **k: (["file.py"], []))
        monkeypatch.setattr(module, "default_branch", lambda *a, **k: "main")
        monkeypatch.setattr(
            module, "block_entity", lambda num, repo, is_pr: blocked_calls.append((num, is_pr))
        )

        res = module.run_self_review_iteration(
            pr_number=10, plan_number=20, request_number=30, iteration=2, repo="owner/repo"
        )

        assert res == "blocked"
        assert len(blocked_calls) == 2
        assert (10, True) in blocked_calls
        assert (30, False) in blocked_calls

    def test_run_self_review_iteration_dispatch_raising(self, monkeypatch):
        module = agent_runner_module()
        blocked_calls = []
        gh_calls = []

        def fake_run_gh(args, **k):
            gh_calls.append(args)
            if args[:2] == ["issue", "view"]:
                return json.dumps({"comments": []})
            if args[:2] == ["pr", "diff"]:
                return "diff"
            if args[:2] == ["api", "repos/owner/repo/dispatches"]:
                raise Exception("simulate dispatch API error")
            return ""

        monkeypatch.setattr(module, "run_gh", fake_run_gh)
        monkeypatch.setattr(module, "run_agent_prompt", lambda *a, **k: "1. Finding A")
        monkeypatch.setattr(module, "get_pr_changed_files", lambda *a, **k: ["file.py"])
        monkeypatch.setattr(module, "parse_plan_files", lambda *a, **k: {"file.py"})
        monkeypatch.setattr(module, "check_scope", lambda *a, **k: (["file.py"], []))
        monkeypatch.setattr(module, "default_branch", lambda *a, **k: "main")
        monkeypatch.setattr(
            module, "block_entity", lambda num, repo, is_pr: blocked_calls.append((num, is_pr))
        )

        res = module.run_self_review_iteration(
            pr_number=10, plan_number=20, request_number=30, iteration=1, repo="owner/repo"
        )

        assert res == "blocked"
        assert len(blocked_calls) == 2
        assert (10, True) in blocked_calls
        assert (30, False) in blocked_calls
        pr_comments = [args for args in gh_calls if args[:2] == ["pr", "comment"]]
        assert any(
            "Self-Review Dispatch Error" in args[args.index("--body") + 1] for args in pr_comments
        )


class TestSelfReviewDispatchCycle:
    """Owner: review posts all findings, dispatches the fix, and repeats until clean - never one long loop."""

    def test_start_dispatches_review_iteration_one(self, monkeypatch):
        module = agent_runner_module()
        sent = []
        monkeypatch.setattr(
            module, "dispatch_stage", lambda repo, payload: sent.append((repo, payload))
        )
        monkeypatch.setattr(module, "find_parent_request_number", lambda plan, repo: None)
        module.start_self_review(10, 20, None, "owner/repo")
        assert sent == [
            (
                "owner/repo",
                {"stage": "self-review", "pr": 10, "plan": 20, "request": 20, "iteration": 1},
            )
        ]

    def test_repository_dispatch_routes_both_stages(self, monkeypatch, tmp_path):
        module = agent_runner_module()
        calls = []
        monkeypatch.setattr(
            module, "run_self_review_iteration", lambda *a: calls.append(("review", a))
        )
        monkeypatch.setattr(module, "run_self_review_fix", lambda *a: calls.append(("fix", a)))
        monkeypatch.setattr(module, "setup_df_accounts", lambda: "home", raising=False)
        for stage in ("self-review", "self-review-fix"):
            event = {
                "action": "agent-dispatch",
                "repository": {"full_name": "owner/repo"},
                "client_payload": {
                    "stage": stage,
                    "pr": 10,
                    "plan": 20,
                    "request": 30,
                    "iteration": 2,
                },
            }
            path = tmp_path / f"{stage}.json"
            path.write_text(json.dumps(event), encoding="utf-8")
            module.dispatch_event(str(path), "repository_dispatch")
        assert calls == [
            ("review", (10, 20, 30, 2, "owner/repo")),
            ("fix", (10, 20, 30, 2, "owner/repo")),
        ]

    def test_no_in_process_review_loop_remains(self):
        module = agent_runner_module()
        source = Path(module.__file__).read_text(encoding="utf-8")
        assert not hasattr(module, "handle_self_review")
        assert "MAX_REVIEW_ITERATIONS" not in source


class TestQuotaBlockRecording:
    """Issue #243: a run that stops on quota records when it may resume."""

    NOW = 1789473600.0  # 2026-09-15T12:00:00Z (05:00 in Los Angeles)

    def test_reset_from_an_iso_timestamp_in_the_error(self):
        module = agent_runner_module()
        detail = "429 quota exhausted; resets at 2026-09-15T14:30:00Z"
        assert module.next_quota_reset(detail, self.NOW) == self.NOW + 2.5 * 3600

    def test_reset_from_a_retry_delay(self):
        module = agent_runner_module()
        assert module.next_quota_reset("Please retry in 33s.", self.NOW) == self.NOW + 33

    def test_reset_falls_back_to_the_next_pacific_midnight(self):
        module = agent_runner_module()
        assert (
            module.next_quota_reset("quota exhausted", self.NOW) == 1789542000.0
        )  # 2026-09-16T07:00Z

    def test_records_the_run_and_keeps_the_provider_map_monotonic(self, monkeypatch):
        module = agent_runner_module()
        calls = []

        def fake_run_gh(args, repo=None):
            calls.append(args)
            if args[1].endswith("/DARKFACTORY_QUOTA_PROVIDERS") and "GET" in args:
                return json.dumps(
                    {
                        "name": "DARKFACTORY_QUOTA_PROVIDERS",
                        "value": json.dumps({"later": 5e9, "earlier": 1.0}),
                    }
                )
            if "POST" in args and any(str(a) == "name=DARKFACTORY_QUOTA_PROVIDERS" for a in args):
                raise subprocess.CalledProcessError(
                    1, ["gh", "api"], stderr="HTTP 409: Already exists"
                )
            return ""

        monkeypatch.setattr(module, "run_gh", fake_run_gh)
        module.record_quota_block("owner/repo", 42, True, self.NOW, ["later", "earlier"], "987")
        run_post = next(c for c in calls if "name=DF_QUOTA_987" in c)
        value = json.loads(next(a for a in run_post if a.startswith("value="))[len("value=") :])
        assert (
            value["item"] == 42
            and value["is_pr"] is True
            and value["reset_at"] == "2026-09-15T12:00:00Z"
        )
        patch = next(
            c for c in calls if "PATCH" in c and c[1].endswith("/DARKFACTORY_QUOTA_PROVIDERS")
        )
        providers = json.loads(next(a for a in patch if a.startswith("value="))[len("value=") :])
        assert providers == {"later": 5e9, "earlier": self.NOW}


class TestResumeDispatch:
    """Issue #243: a resume dispatch continues the item exactly like a /df resume comment."""

    def _dispatch(self, monkeypatch, tmp_path, item, is_pr, labels, plan_exists=False):
        module = agent_runner_module()
        calls = []
        monkeypatch.setattr(module, "load_checkpoint", lambda **k: None)
        monkeypatch.setattr(module, "unblock_entity", lambda *a, **k: None)
        monkeypatch.setattr(module, "has_plan", lambda n, r: plan_exists)
        monkeypatch.setattr(module, "handle_plan", lambda *a, **k: calls.append(("plan", a)))
        monkeypatch.setattr(
            module, "handle_implement", lambda *a, **k: calls.append(("implement", a))
        )
        monkeypatch.setattr(module, "start_self_review", lambda *a: calls.append(("review", a)))
        monkeypatch.setattr(module, "find_plan_issue_for_pr", lambda n, r: 20)
        monkeypatch.setattr(
            module,
            "run_gh",
            lambda args, repo=None: json.dumps({"labels": [{"name": l} for l in labels]}),
        )
        monkeypatch.setattr(module, "setup_df_accounts", lambda: "home", raising=False)
        event = {
            "action": "agent-dispatch",
            "repository": {"full_name": "owner/repo"},
            "client_payload": {"stage": "resume", "item": item, "is_pr": is_pr},
        }
        path = tmp_path / "resume.json"
        path.write_text(json.dumps(event), encoding="utf-8")
        module.dispatch_event(str(path), "repository_dispatch")
        return calls

    def test_a_request_with_a_plan_resumes_implementation(self, monkeypatch, tmp_path):
        assert self._dispatch(monkeypatch, tmp_path, 7, False, ["Request"], plan_exists=True) == [
            ("implement", (7, 7, "owner/repo"))
        ]

    def test_a_request_without_a_plan_resumes_planning(self, monkeypatch, tmp_path):
        assert self._dispatch(monkeypatch, tmp_path, 7, False, ["Request"]) == [
            ("plan", (7, 7, "owner/repo"))
        ]

    def test_a_pull_request_resumes_self_review(self, monkeypatch, tmp_path):
        assert self._dispatch(monkeypatch, tmp_path, 10, True, []) == [
            ("review", (10, 20, None, "owner/repo"))
        ]

    def test_an_issue_that_is_neither_request_nor_plan_is_not_started(self, monkeypatch, tmp_path):
        assert self._dispatch(monkeypatch, tmp_path, 5, False, ["pipeline-failure"]) == []


def test_gh_api_calls_never_get_a_repo_flag(monkeypatch):
    """`gh api --repo` fails with "unknown flag: --repo"; dispatches and variable writes use `gh api`."""
    module = agent_runner_module()
    seen = []

    class Done:
        returncode = 0
        stdout = "{}"
        stderr = ""

    monkeypatch.setattr(
        module.subprocess, "run", lambda cmd, **kwargs: (seen.append(cmd), Done())[1]
    )
    module.run_gh(["api", "repos/owner/repo/dispatches", "--method", "POST"], repo="owner/repo")
    module.run_gh(["issue", "view", "1"], repo="owner/repo")
    assert "--repo" not in seen[0]
    assert seen[1][-2:] == ["--repo", "owner/repo"]


def test_checkout_pr_branch_switches_to_the_head_branch(monkeypatch):
    """Dispatched stages start on the default branch; review and fix runs must work on the PR's branch."""
    module = agent_runner_module()
    git_calls = []
    monkeypatch.setattr(
        module, "run_gh", lambda args, repo=None: json.dumps({"headRefName": "feature/x"})
    )
    monkeypatch.setattr(module, "run_git", lambda args, cwd=None: git_calls.append(args) or "")
    assert module.checkout_pr_branch(10, "owner/repo", cwd="/work") == "feature/x"
    assert git_calls[-2:] == [
        ["fetch", "origin", "feature/x"],
        ["checkout", "-B", "feature/x", "origin/feature/x"],
    ]
    # The branch is ready for commits: a dispatched fix stage failed with "Author identity unknown".
    assert ["config", "user.email", module.GIT_BOT_EMAIL] in git_calls[:-2]


def test_configure_git_identity_sets_the_bot_identity_and_survives_git_errors(monkeypatch):
    """Every git config call goes through run_git, and a failing one does not stop the others."""
    module = agent_runner_module()
    calls = []

    def fake_git(args, cwd=None):
        calls.append((args, cwd))
        if "safe.directory" in args:
            raise subprocess.CalledProcessError(1, ["git"] + args, stderr="locked")
        return ""

    monkeypatch.setattr(module, "run_git", fake_git)
    module.configure_git_identity("/work")
    assert (["config", "user.name", module.GIT_BOT_NAME], "/work") in calls
    assert (["config", "--global", "user.email", module.GIT_BOT_EMAIL], "/work") in calls
    assert len(calls) == 5


class TestPrFeedbackRevision:
    """Owner feedback on a pull request becomes a code revision, then goes through self-review again."""

    def _comment_event(self, monkeypatch, tmp_path, body, plan=20):
        module = agent_runner_module()
        calls = {"dispatch": [], "respond": []}
        monkeypatch.setattr(
            module, "dispatch_stage", lambda repo, payload: calls["dispatch"].append(payload)
        )
        monkeypatch.setattr(module, "handle_respond", lambda *a, **k: calls["respond"].append(a))
        monkeypatch.setattr(module, "find_plan_issue_for_pr", lambda n, r: plan)
        monkeypatch.setattr(module, "find_parent_request_number", lambda n, r: None)
        monkeypatch.setattr(module, "is_allowed_approver", lambda *a, **k: True)
        monkeypatch.setattr(module, "setup_df_accounts", lambda: "home", raising=False)
        event = {
            "action": "created",
            "repository": {"full_name": "owner/repo"},
            "comment": {
                "body": body,
                "user": {"login": "marius-patrik", "type": "User"},
                "author_association": "OWNER",
            },
            "pull_request": {"number": 10, "user": {"login": "github-actions[bot]"}},
        }
        path = tmp_path / "review.json"
        path.write_text(json.dumps(event), encoding="utf-8")
        module.dispatch_event(str(path), "pull_request_review_comment")
        return calls

    def test_a_reject_review_comment_dispatches_a_revision_with_the_feedback(
        self, monkeypatch, tmp_path
    ):
        calls = self._comment_event(
            monkeypatch, tmp_path, "/df reject rename the helper and add a test"
        )
        assert calls["respond"] == []
        assert calls["dispatch"] == [
            {
                "stage": "pr-feedback-fix",
                "pr": 10,
                "plan": 20,
                "request": 20,
                "feedback": "rename the helper and add a test",
            }
        ]

    def test_a_plain_review_comment_is_only_answered(self, monkeypatch, tmp_path):
        calls = self._comment_event(monkeypatch, tmp_path, "why is this function so long?")
        assert calls["dispatch"] == [] and len(calls["respond"]) == 1

    def test_the_revision_is_pushed_announced_and_reviewed_again(self, monkeypatch):
        module = agent_runner_module()
        gh_calls, git_calls, reviews = [], [], []

        def fake_gh(args, repo=None):
            gh_calls.append(args)
            return (
                json.dumps({"title": "Plan", "body": "Files: a.py", "comments": []})
                if args[:2] == ["issue", "view"]
                else ""
            )

        def fake_git(args, cwd=None):
            git_calls.append(args)
            return " M a.py" if args[:1] == ["status"] else ""

        monkeypatch.setattr(module, "run_gh", fake_gh)
        monkeypatch.setattr(module, "run_git", fake_git)
        monkeypatch.setattr(module, "format_repository", lambda cwd: None)
        monkeypatch.setattr(
            module, "run_agent_prompt", lambda prompt, **k: "Renamed the helper and added a test."
        )
        monkeypatch.setattr(module, "start_self_review", lambda *a: reviews.append(a))
        module.run_pr_feedback_fix(10, 20, 30, "rename the helper", "owner/repo")
        assert ["push", "origin", "HEAD"] in git_calls
        assert any(
            c[:2] == ["pr", "comment"] and "### Feedback addressed" in c[-1] for c in gh_calls
        )
        assert reviews == [(10, 20, 30, "owner/repo")]

    def test_an_execution_error_blocks_without_review(self, monkeypatch):
        module = agent_runner_module()
        gh_calls, blocked, reviews = [], [], []
        monkeypatch.setattr(
            module,
            "run_gh",
            lambda args, repo=None: gh_calls.append(args)
            or json.dumps({"body": "", "comments": []}),
        )
        monkeypatch.setattr(
            module,
            "run_agent_prompt",
            lambda prompt, **k: "[DarkFactory Agent Execution Error]: model crashed",
        )
        monkeypatch.setattr(module, "block_entity", lambda n, **k: blocked.append(n))
        monkeypatch.setattr(module, "start_self_review", lambda *a: reviews.append(a))
        module.run_pr_feedback_fix(10, 20, 30, "rename the helper", "owner/repo")
        assert blocked == [10, 30] and reviews == []
        assert any(
            "### Feedback Fix Error" in c[-1] for c in gh_calls if c[:2] == ["pr", "comment"]
        )

    @pytest.mark.parametrize(
        "status, commit_error, expected",
        [
            (" M a.py", "Author identity unknown", "Author identity unknown"),
            ("", None, "without changing any file"),
        ],
    )
    def test_an_unpushed_revision_is_reported_never_announced(
        self, monkeypatch, status, commit_error, expected
    ):
        """E2E #314: a failed commit was announced as "Feedback addressed" and reviewed unchanged."""
        module = agent_runner_module()
        gh_calls, git_calls, blocked, reviews = [], [], [], []

        def fake_git(args, cwd=None):
            git_calls.append(args)
            if args[:1] == ["commit"] and commit_error:
                raise subprocess.CalledProcessError(128, ["git"] + args, stderr=commit_error)
            return status if args[:1] == ["status"] else ""

        monkeypatch.setattr(
            module,
            "run_gh",
            lambda args, repo=None: gh_calls.append(args)
            or json.dumps({"body": "Plan", "comments": []}),
        )
        monkeypatch.setattr(module, "run_git", fake_git)
        monkeypatch.setattr(module, "format_repository", lambda cwd: None)
        monkeypatch.setattr(module, "run_agent_prompt", lambda prompt, **k: "Done, all fixed.")
        monkeypatch.setattr(module, "block_entity", lambda n, **k: blocked.append(n))
        monkeypatch.setattr(module, "start_self_review", lambda *a: reviews.append(a))
        module.run_pr_feedback_fix(10, 20, 30, "compute it once", "owner/repo")
        comments = [c[-1] for c in gh_calls if c[:2] == ["pr", "comment"]]
        assert blocked == [10, 30] and reviews == []
        assert ["push", "origin", "HEAD"] not in git_calls
        assert len(comments) == 1 and "### Feedback Fix Error" in comments[0]
        assert expected in comments[0] and "### Feedback addressed" not in comments[0]


def test_checkpoint_and_notify_exhaustion_includes_resume_time_and_instructions(monkeypatch):
    """The quota exhaustion notice states the automatic resume time (UTC) and names /df resume."""
    module = agent_runner_module()
    posted_comments = []
    monkeypatch.setattr(module, "save_checkpoint", lambda *a, **k: "checkpoint.json")
    monkeypatch.setattr(module, "run_git", lambda *a, **k: "")
    monkeypatch.setattr(
        module,
        "run_gh",
        lambda args, repo=None: posted_comments.append(args) or "",
    )
    monkeypatch.setattr(module, "update_project_status_blocked", lambda *a, **k: None)
    recorded_blocks = []
    monkeypatch.setenv("GITHUB_RUN_ID", "run-123")
    monkeypatch.setattr(
        module,
        "record_quota_block",
        lambda repo, item_number, is_pr, reset_at, providers, run_id: recorded_blocks.append(
            (repo, item_number, is_pr, reset_at, providers, run_id)
        ),
    )
    monkeypatch.setattr(
        module, "next_quota_reset", lambda detail, now: 1742054400.0
    )  # 2025-03-15 16:00:00 UTC

    module.checkpoint_and_notify_exhaustion(
        issue_number=42,
        repo="owner/repo",
        error_detail="quota exceeded",
        branch_name="feature/foo",
    )

    comment_body = next(
        args[args.index("--body") + 1] for args in posted_comments if "--body" in args
    )
    assert "2025-03-15 16:00:00 UTC" in comment_body
    assert "/df resume" in comment_body
    assert len(recorded_blocks) == 1
    assert recorded_blocks[0][3] == 1742054400.0
