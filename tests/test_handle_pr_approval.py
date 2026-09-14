"""Unit tests for the pull request approval and auto-merge handler."""

import os
import subprocess
from typing import Any, Dict, List

import pytest

import handle_pr_approval
from handle_pr_approval import collect_bound_issues, detect_approval, submit_proxy_review


def test_collect_bound_issues_merges_both_sources():
    """GitHub's link graph and the body regex are unioned, then deduplicated."""
    data = {
        "closingIssuesReferences": [{"number": 5}, {"number": 7}],
        "body": "Closes #7 and fixes #9",
    }
    assert collect_bound_issues(data) == [5, 7, 9]


def test_collect_bound_issues_tolerates_missing_fields():
    """A pull request with neither source yields nothing rather than raising."""
    assert collect_bound_issues({}) == []
    assert collect_bound_issues({"closingIssuesReferences": None, "body": None}) == []


@pytest.mark.parametrize(
    "body,expected",
    [
        ("approve", True),
        ("/approve", True),
        ("LGTM", True),
        ("merge", True),
        ("/df approve", True),
        ("looks good to me, approve when ready", False),
        ("I do not approve yet", False),
        ("/df reject", False),
        ("/reject", False),
        ("/df revise", False),
        ("/df resume", False),
        ("good", False),
        ("", False),
    ],
)
def test_detect_approval_from_comment(monkeypatch: pytest.MonkeyPatch, body: str, expected: bool):
    """Only an approval command counts; prose and rejections do not.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        body: Comment body.
        expected: Whether it should register as an approval.
    """
    monkeypatch.setenv("GITHUB_EVENT_NAME", "issue_comment")
    monkeypatch.setenv("IS_PR", "true")
    monkeypatch.setenv("PR_NUMBER", "42")
    monkeypatch.setenv("COMMENT_BODY", body)
    _pr, approved = detect_approval()
    assert approved is expected


def test_detect_approval_ignores_comments_outside_pull_requests(monkeypatch: pytest.MonkeyPatch):
    """An `approve` on a plain issue is a plan gate, not a merge instruction.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv("GITHUB_EVENT_NAME", "issue_comment")
    monkeypatch.setenv("IS_PR", "false")
    monkeypatch.setenv("COMMENT_BODY", "approve")
    assert detect_approval() == (None, False)


@pytest.mark.parametrize("state", ["approved", "APPROVED", "Approved"])
def test_detect_approval_from_native_review_state(monkeypatch: pytest.MonkeyPatch, state: str):
    """A native `APPROVED` review counts without consulting `IS_PR`.

    The workflow used to derive `IS_PR` from the `issue` object, which
    `pull_request_review` events do not carry — so every native approval was missed.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        state: Review state.
    """
    monkeypatch.setenv("GITHUB_EVENT_NAME", "pull_request_review")
    monkeypatch.delenv("IS_PR", raising=False)
    monkeypatch.setenv("PR_NUMBER", "7")
    monkeypatch.setenv("REVIEW_STATE", state)
    monkeypatch.setenv("REVIEW_BODY", "")
    assert detect_approval() == ("7", True)


@pytest.mark.parametrize(
    "state,body",
    [
        ("commented", "approve"),
        ("commented", "LGTM, merge it"),
        ("changes_requested", "approve"),
        ("dismissed", ""),
        ("", "approved"),
    ],
)
def test_review_body_words_never_count(monkeypatch: pytest.MonkeyPatch, state: str, body: str):
    """The loose body match fired on "I don't approve yet"; only state counts.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        state: Review state.
        body: Review body.
    """
    monkeypatch.setenv("GITHUB_EVENT_NAME", "pull_request_review")
    monkeypatch.setenv("PR_NUMBER", "7")
    monkeypatch.setenv("REVIEW_STATE", state)
    monkeypatch.setenv("REVIEW_BODY", body)
    _pr, approved = detect_approval()
    assert approved is False


def test_actor_gate_rejects_strangers(monkeypatch: pytest.MonkeyPatch, capsys):
    """Owner decision 9c: neither the author nor a role means no merge path.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        capsys: Pytest capture fixture.
    """
    monkeypatch.setenv("GITHUB_ACTOR", "stranger")
    monkeypatch.setenv("APPROVER_ASSOCIATION", "CONTRIBUTOR")
    monkeypatch.setenv("ISSUE_AUTHOR", "marius-patrik")
    monkeypatch.setenv("GITHUB_REPOSITORY", "o/r")
    monkeypatch.setattr(
        handle_pr_approval,
        "_gh",
        lambda *a, **k: pytest.fail("a stranger must not reach the merge path"),
    )
    with pytest.raises(SystemExit) as exc:
        handle_pr_approval.handle_pr_approval()
    assert exc.value.code == 0


def test_actor_gate_rejects_bots_even_with_owner_association(
    monkeypatch: pytest.MonkeyPatch, capsys
):
    """A bot account never approves, however privileged its association.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        capsys: Pytest capture fixture.
    """
    monkeypatch.setenv("GITHUB_ACTOR", "github-actions[bot]")
    monkeypatch.setenv("APPROVER_ASSOCIATION", "OWNER")
    monkeypatch.setenv("GITHUB_REPOSITORY", "o/r")
    monkeypatch.setattr(
        handle_pr_approval,
        "_gh",
        lambda *a, **k: pytest.fail("a bot must not reach the merge path"),
    )
    with pytest.raises(SystemExit) as exc:
        handle_pr_approval.handle_pr_approval()
    assert exc.value.code == 0


def test_request_author_passes_the_actor_gate(monkeypatch: pytest.MonkeyPatch, capsys):
    """The Request author approves without holding a privileged role.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        capsys: Pytest capture fixture.
    """
    monkeypatch.setenv("GITHUB_ACTOR", "author")
    monkeypatch.setenv("APPROVER_ASSOCIATION", "CONTRIBUTOR")
    monkeypatch.setenv("ISSUE_AUTHOR", "author")
    monkeypatch.setenv("GITHUB_EVENT_NAME", "issue_comment")
    monkeypatch.setenv("IS_PR", "true")
    monkeypatch.setenv("PR_NUMBER", "42")
    monkeypatch.setenv("COMMENT_BODY", "/df approve")
    monkeypatch.setenv("GITHUB_REPOSITORY", "o/r")

    def fake_gh(args: List[str], repo: str, check: bool = False, as_bot: bool = False):
        return subprocess.CompletedProcess(
            args, 0, '{"isDraft": false, "state": "MERGED", "reviewDecision": ""}', ""
        )

    monkeypatch.setattr(handle_pr_approval, "_gh", fake_gh)
    with pytest.raises(SystemExit):
        handle_pr_approval.handle_pr_approval()
    assert "approved by @author" in capsys.readouterr().out


def test_proxy_review_refuses_without_a_bot_token(monkeypatch: pytest.MonkeyPatch):
    """Sending the approval as the author's own token is silently rejected by GitHub.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.delenv("BOT_TOKEN", raising=False)
    calls: List[List[str]] = []
    monkeypatch.setattr(
        handle_pr_approval,
        "_gh",
        lambda *a, **k: calls.append(a) or subprocess.CompletedProcess([], 0, "", ""),
    )
    assert submit_proxy_review(1, "o/r", "someone") is False
    assert calls == [], "no approval may be attempted without a bot token"


def test_proxy_review_verifies_that_the_review_landed(monkeypatch: pytest.MonkeyPatch):
    """A failed approval must be reported, not assumed to have worked.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv("BOT_TOKEN", "bot")

    def fake_gh(args: List[str], repo: str, check: bool = False, as_bot: bool = False):
        if args[0] == "pr":
            assert as_bot, "the approval must be sent with the bot token"
            return subprocess.CompletedProcess(args, 1, "", "not permitted to approve own PR")
        return subprocess.CompletedProcess(args, 0, "", "")

    monkeypatch.setattr(handle_pr_approval, "_gh", fake_gh)
    assert submit_proxy_review(1, "o/r", "someone") is False


def test_proxy_review_reports_success(monkeypatch: pytest.MonkeyPatch):
    """An approval that lands is reported as such.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
    """
    monkeypatch.setenv("BOT_TOKEN", "bot")

    def fake_gh(args: List[str], repo: str, check: bool = False, as_bot: bool = False):
        if args[0] == "pr":
            return subprocess.CompletedProcess(args, 0, "", "")
        return subprocess.CompletedProcess(args, 0, "APPROVED\n", "")

    monkeypatch.setattr(handle_pr_approval, "_gh", fake_gh)
    assert submit_proxy_review(1, "o/r", "someone") is True
