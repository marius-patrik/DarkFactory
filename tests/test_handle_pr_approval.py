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
        ("looks good to me, approve when ready", False),
        ("", False),
    ],
)
def test_detect_approval_from_comment(monkeypatch: pytest.MonkeyPatch, body: str, expected: bool):
    """Only a bare approval word counts; prose mentioning it does not.

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
