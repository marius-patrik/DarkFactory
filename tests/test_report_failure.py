"""Tests for turning a failed pipeline run into an issue.

The behaviour that matters is deduplication: a workflow failing on every push must produce one
issue that gains comments, not an issue per push.
"""

import json
import subprocess
from typing import Any, Dict, List

import pytest

import report_failure


class FakeGh:
    """Records `gh` invocations and replays canned issue listings."""

    def __init__(self, issues: List[Dict[str, Any]] = None) -> None:
        self.issues = issues or []
        self.calls: List[List[str]] = []

    def __call__(self, args: List[str]) -> str:
        self.calls.append(args)
        if args[:2] == ["issue", "list"]:
            return json.dumps(self.issues)
        if args[:2] == ["issue", "create"]:
            return "https://github.com/o/r/issues/42"
        return ""

    def named(self, *prefix: str) -> List[List[str]]:
        """Returns the recorded calls beginning with `prefix`."""
        return [c for c in self.calls if c[: len(prefix)] == list(prefix)]


@pytest.fixture
def gh(monkeypatch):
    """Replaces the `gh` runner with a recorder."""
    fake = FakeGh()
    monkeypatch.setattr(report_failure, "_gh", fake)
    return fake


def test_a_first_failure_opens_an_issue(gh):
    """Nothing is open, so the failure gets one."""
    assert report_failure.report("o/r", "CI", "https://run/1", "1") == 42
    created = gh.named("issue", "create")
    assert len(created) == 1
    assert "Pipeline failure: CI" in created[0]
    assert report_failure.FAILURE_LABEL in created[0]


def test_a_repeat_failure_comments_instead_of_duplicating(monkeypatch):
    """The cure must not be worse than the disease: one issue per failing workflow, not per push."""
    fake = FakeGh([{"number": 7, "body": report_failure.MARKER.format(workflow="CI")}])
    monkeypatch.setattr(report_failure, "_gh", fake)
    assert report_failure.report("o/r", "CI", "https://run/2", "2") == 7
    assert fake.named("issue", "create") == []
    assert len(fake.named("issue", "comment")) == 1


def test_another_workflow_gets_its_own_issue(monkeypatch):
    """An open issue for CI must not absorb a failure of a different workflow."""
    fake = FakeGh([{"number": 7, "body": report_failure.MARKER.format(workflow="CI")}])
    monkeypatch.setattr(report_failure, "_gh", fake)
    report_failure.report("o/r", "Release", "https://run/3", "3")
    assert len(fake.named("issue", "create")) == 1


def test_identity_survives_a_retitled_issue(monkeypatch):
    """Identity lives in a body marker, so renaming by hand does not spawn a duplicate."""
    fake = FakeGh(
        [
            {
                "number": 7,
                "body": "Someone rewrote this.\n" + report_failure.MARKER.format(workflow="CI"),
            }
        ]
    )
    monkeypatch.setattr(report_failure, "_gh", fake)
    assert report_failure.find_open_issue("o/r", "CI") == 7


def test_success_closes_the_open_issue(monkeypatch):
    """Green again means the record is resolved, not left behind."""
    fake = FakeGh([{"number": 7, "body": report_failure.MARKER.format(workflow="CI")}])
    monkeypatch.setattr(report_failure, "_gh", fake)
    report_failure.resolve("o/r", "CI")
    closed = fake.named("issue", "close")
    assert len(closed) == 1 and "7" in closed[0]


def test_success_with_nothing_open_does_nothing(gh):
    """A workflow that was never broken must not be commented on."""
    report_failure.resolve("o/r", "CI")
    assert gh.named("issue", "close") == []


class TestFailingLoudly:
    """Reporting a failure is itself a step; swallowing its errors defeats the whole point."""

    def setup_method(self):
        """Clears the flag left by an earlier test."""
        report_failure.FAILED = False

    def test_being_unable_to_file_is_not_silent(self, monkeypatch):
        """A missing label or revoked token must not be reported as a successful run."""

        def boom(args):
            if args[:2] == ["issue", "list"]:
                return "[]"
            raise subprocess.CalledProcessError(1, args, stderr="label not found")

        monkeypatch.setattr(report_failure, "_gh", boom)
        assert report_failure.report("o/r", "CI", "https://run/1", "1") is None
        assert report_failure.FAILED is True

    def test_a_successful_filing_leaves_the_flag_clear(self, gh):
        """The flag must mean something, so the ordinary path must not set it."""
        report_failure.report("o/r", "CI", "https://run/1", "1")
        assert report_failure.FAILED is False


class TestDuplicateCleanup:
    """Filing is not serialised, so two runs can both file; the extra is cleaned up after."""

    def setup_method(self):
        """Clears the failure flag left by an earlier test."""
        report_failure.FAILED = False

    def test_a_second_issue_for_the_same_workflow_is_closed(self, monkeypatch):
        """The exact outcome observed: three runs finished together and filed three issues."""
        marker = report_failure.MARKER.format(workflow="CI")
        fake = FakeGh([{"number": 7, "body": marker}, {"number": 9, "body": marker}])
        monkeypatch.setattr(report_failure, "_gh", fake)
        assert report_failure._close_duplicates("o/r", "CI", keep=7) == 1
        closed = fake.named("issue", "close")
        assert len(closed) == 1 and "9" in closed[0], "the later issue is the duplicate"

    def test_the_kept_issue_is_never_closed(self, monkeypatch):
        """Its comments are the ones people will have replied to."""
        marker = report_failure.MARKER.format(workflow="CI")
        fake = FakeGh([{"number": 7, "body": marker}])
        monkeypatch.setattr(report_failure, "_gh", fake)
        assert report_failure._close_duplicates("o/r", "CI", keep=7) == 0
        assert fake.named("issue", "close") == []

    def test_another_workflows_issue_is_left_alone(self, monkeypatch):
        """Only issues carrying this workflow's marker are duplicates of it."""
        fake = FakeGh(
            [
                {"number": 7, "body": report_failure.MARKER.format(workflow="CI")},
                {"number": 8, "body": report_failure.MARKER.format(workflow="Release")},
            ]
        )
        monkeypatch.setattr(report_failure, "_gh", fake)
        assert report_failure._close_duplicates("o/r", "CI", keep=7) == 0
