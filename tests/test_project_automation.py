"""Unit tests for the project board automation."""

import os
from typing import Any, Dict, List, Optional, Tuple

import pytest

from project_automation import (
    STATUS_NAMES,
    GitHubProjectClient,
    determine_status_from_labels,
    extract_bound_issues,
    process_event,
)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "marius-patrik/DarkFactory"


class FakeProjectClient:
    """Records board mutations instead of performing them."""

    def __init__(self) -> None:
        self.added_items: List[Tuple[str, str]] = []
        self.edited_statuses: List[Tuple[str, str]] = []
        self.status_labels: List[Tuple[str, int, str]] = []
        self.added_labels: List[Tuple[str, int, str]] = []
        self.closed_issues: List[Tuple[str, int]] = []

    def add_item(self, url: str) -> str:
        """Records an item addition and returns a synthetic id."""
        item_id = f"item-{len(self.added_items) + 1}"
        self.added_items.append((url, item_id))
        return item_id

    def edit_status(self, item_id: str, status_name: str) -> bool:
        """Records a status change."""
        self.edited_statuses.append((item_id, status_name))
        return True

    def set_status_label(self, repo: str, issue_number: int, status_name: str) -> None:
        """Records an exclusive status-label assignment."""
        self.status_labels.append((repo, issue_number, status_name))

    def add_issue_label(self, repo: str, issue_number: int, label: str) -> None:
        """Records a label addition, routing status labels through the exclusive setter."""
        if label in set(STATUS_NAMES):
            self.set_status_label(repo, issue_number, label)
            return
        self.added_labels.append((repo, issue_number, label))

    def close_issue(self, repo: str, issue_number: int) -> None:
        """Records an issue closure."""
        self.closed_issues.append((repo, issue_number))


def test_extract_bound_issues_various_formats():
    """Closing keywords are recognised in every documented form."""
    assert extract_bound_issues("Closes #123") == [123]
    assert extract_bound_issues("Fixes #45 and resolves #67") == [45, 67]
    assert extract_bound_issues("CLOSED #10") == [10]
    assert extract_bound_issues(f"Resolves https://github.com/{REPO}/issues/89") == [89]
    assert extract_bound_issues("Just discussing issue #123 without keyword") == []
    assert extract_bound_issues("") == []
    assert extract_bound_issues(None) == []


def test_extract_bound_issues_deduplicates_and_sorts():
    """Repeated references collapse to one sorted list."""
    assert extract_bound_issues("Closes #7, fixes #3, resolves #7") == [3, 7]


def test_determine_status_from_labels_precedence():
    """Terminal statuses outrank active ones so stale labels cannot win."""
    assert determine_status_from_labels(["bug", "Blocked"]) == "Blocked"
    assert determine_status_from_labels(["enhancement", "In Progress"]) == "In Progress"
    assert determine_status_from_labels(["Backlog"]) == "Backlog"
    assert determine_status_from_labels(["ToDo"]) == "ToDo"
    assert determine_status_from_labels(["Done"]) == "Done"
    assert determine_status_from_labels(["Superseded"]) == "Superseded"
    assert determine_status_from_labels(["Dropped"]) == "Dropped"
    assert determine_status_from_labels(["random", "label"]) == "ToDo"
    assert determine_status_from_labels([]) == "ToDo"


def test_determine_status_prefers_terminal_over_stale_in_progress():
    """The stale-`In Progress` defect: a Done label must win outright."""
    assert determine_status_from_labels(["In Progress", "Done"]) == "Done"
    assert determine_status_from_labels(["In Progress", "Dropped"]) == "Dropped"


def test_determine_status_accepts_to_do_spelling():
    """`To Do` and `ToDo` mean the same column."""
    assert determine_status_from_labels(["To Do"]) == "ToDo"


def test_issue_opened_is_tracked_with_label_derived_status():
    """A new issue lands on the board at the status its labels imply."""
    client = FakeProjectClient()
    payload = {
        "action": "opened",
        "repository": {"full_name": REPO},
        "issue": {
            "number": 1,
            "html_url": f"https://github.com/{REPO}/issues/1",
            "labels": [{"name": "In Progress"}],
        },
    }
    process_event("issues", payload, client=client)
    assert len(client.added_items) == 1
    assert client.edited_statuses == [("item-1", "In Progress")]


def test_issue_closed_moves_to_done_and_clears_stale_status_labels():
    """Closing an active issue marks it Done exclusively, removing `In Progress`."""
    client = FakeProjectClient()
    payload = {
        "action": "closed",
        "repository": {"full_name": REPO},
        "issue": {
            "number": 1,
            "html_url": f"https://github.com/{REPO}/issues/1",
            "labels": [{"name": "In Progress"}],
        },
    }
    process_event("issues", payload, client=client)
    assert client.edited_statuses == [("item-1", "Done")]
    assert client.status_labels == [(REPO, 1, "Done")]


def test_issue_closed_as_dropped_is_not_forced_to_done():
    """An explicitly dropped issue keeps its terminal status when it closes."""
    client = FakeProjectClient()
    payload = {
        "action": "closed",
        "repository": {"full_name": REPO},
        "issue": {
            "number": 2,
            "html_url": f"https://github.com/{REPO}/issues/2",
            "labels": [{"name": "Dropped"}],
        },
    }
    process_event("issues", payload, client=client)
    assert client.edited_statuses == [("item-1", "Dropped")]
    assert client.status_labels == [(REPO, 2, "Dropped")]


def test_pr_opened_moves_bound_issues_to_in_progress():
    """Opening a PR advertises its bound issues as active."""
    client = FakeProjectClient()
    payload = {
        "action": "opened",
        "repository": {"full_name": REPO},
        "pull_request": {
            "html_url": f"https://github.com/{REPO}/pull/9",
            "body": "Implements the feature. Closes #5",
            "labels": [],
        },
    }
    process_event("pull_request", payload, client=client)
    assert client.status_labels == [(REPO, 5, "In Progress")]
    assert ("item-1", "In Progress") in client.edited_statuses


def test_pr_merged_marks_everything_done_and_closes_issues():
    """Merging reconciles the PR, its issues, their labels, and their open state."""
    client = FakeProjectClient()
    payload = {
        "action": "closed",
        "repository": {"full_name": REPO},
        "pull_request": {
            "html_url": f"https://github.com/{REPO}/pull/9",
            "body": "Fixes the bug. Resolves #5",
            "merged": True,
            "labels": [],
        },
    }
    process_event("pull_request", payload, client=client)
    assert client.status_labels == [(REPO, 5, "Done")]
    assert client.closed_issues == [(REPO, 5)]
    assert ("item-1", "Done") in client.edited_statuses


def test_pr_closed_unmerged_is_dropped_not_done():
    """Abandoning a PR must never look like success on the board."""
    client = FakeProjectClient()
    payload = {
        "action": "closed",
        "repository": {"full_name": REPO},
        "pull_request": {
            "html_url": f"https://github.com/{REPO}/pull/9",
            "body": "Closes #5",
            "merged": False,
            "labels": [],
        },
    }
    process_event("pull_request", payload, client=client)
    assert client.edited_statuses == [("item-1", "Dropped")]
    assert client.status_labels == []
    assert client.closed_issues == []


def test_push_to_main_closes_issues_referenced_in_commit_messages():
    """A direct push that carries a closing keyword still reconciles the board."""
    client = FakeProjectClient()
    payload = {
        "ref": "refs/heads/main",
        "repository": {"full_name": REPO},
        "commits": [{"message": "fix(core): correct frame codec\n\nCloses #12"}],
    }
    process_event("push", payload, client=client)
    assert client.status_labels == [(REPO, 12, "Done")]
    assert client.closed_issues == [(REPO, 12)]


def test_push_to_other_branches_is_ignored():
    """Only the default branch reconciles the board."""
    client = FakeProjectClient()
    payload = {
        "ref": "refs/heads/feature/x",
        "repository": {"full_name": REPO},
        "commits": [{"message": "Closes #12"}],
    }
    process_event("push", payload, client=client)
    assert client.closed_issues == []


def test_reconciliation_uses_labels_not_a_blanket_todo(monkeypatch: pytest.MonkeyPatch):
    """Self-healing must not promote backlog items into the ready queue."""
    from project_automation import reconcile_unassigned_statuses

    items = {
        "items": [
            {"id": "i1", "labels": ["epic", "Backlog"], "content": {"title": "epic"}},
            {"id": "i2", "labels": ["bug"], "content": {"title": "untriaged"}},
            {"id": "i3", "labels": [], "status": "Done", "content": {"title": "already set"}},
            {"id": "i4", "labels": [], "content": {"title": "closed", "closed": True}},
        ]
    }

    class Recorder(GitHubProjectClient):
        """Captures status writes without touching the API."""

        def __init__(self) -> None:
            super().__init__(owner="o", project_number=1)
            self.writes: List[Tuple[str, str]] = []

        def run_gh(self, args: List[str]) -> str:
            """Returns a canned item listing."""
            import json as _json

            return _json.dumps(items)

        def edit_status(self, item_id: str, status_name: str) -> bool:
            """Records the write."""
            self.writes.append((item_id, status_name))
            return True

    client = Recorder()
    reconcile_unassigned_statuses(client)
    assert client.writes == [("i1", "Backlog"), ("i2", "ToDo")]


def test_status_field_ids_are_not_hardcoded():
    """Board ids are resolved at runtime; a hardcoded id breaks on every board rebuild."""
    path = os.path.join(REPO_ROOT, ".github", "scripts", "project_automation.py")
    with open(path, encoding="utf-8") as handle:
        source = handle.read()
    assert "PVTSSF_" not in source, "Status field id must be discovered, not hardcoded"
    assert "field-list" in source, "Status field must be resolved via `gh project field-list`"


def test_client_caches_discovery_lookups(monkeypatch: pytest.MonkeyPatch):
    """Field discovery runs once per process, not once per mutation."""
    calls: List[List[str]] = []

    def fake_run_gh(self: GitHubProjectClient, args: List[str]) -> str:
        calls.append(args)
        if args[1] == "field-list":
            return (
                '{"fields":[{"id":"F1","name":"Status","options":'
                '[{"id":"o1","name":"ToDo"},{"id":"o2","name":"Done"}]}]}'
            )
        return '{"id":"P1"}'

    monkeypatch.setattr(GitHubProjectClient, "run_gh", fake_run_gh)
    client = GitHubProjectClient(owner="o", project_number=1)
    assert client.status_option_id("ToDo") == "o1"
    assert client.status_option_id("Done") == "o2"
    assert client.status_field_id == "F1"
    assert sum(1 for args in calls if args[1] == "field-list") == 1
