"""Unit tests for the project board automation."""

import os
import subprocess
from typing import Any, Dict, List, Optional, Tuple

import pytest

import project_automation
from project_automation import (
    STATUS_NAMES,
    GitHubProjectClient,
    determine_status_from_labels,
    extract_bound_issues,
    process_event,
)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "marius-patrik/DarkFactory"


@pytest.fixture(autouse=True)
def reset_global_state():
    """Resets global rate limit and mutation tracking between tests."""
    project_automation.RATE_LIMITED = False
    project_automation.MUTATIONS_PERFORMED = 0
    project_automation.FAILURES = []
    yield
    project_automation.RATE_LIMITED = False
    project_automation.MUTATIONS_PERFORMED = 0
    project_automation.FAILURES = []


class FakeProjectClient:
    """Records board mutations instead of performing them."""

    def __init__(self) -> None:
        self.added_items: List[Tuple[str, str]] = []
        self.edited_statuses: List[Tuple[str, str]] = []
        self.status_labels: List[Tuple[str, int, str]] = []
        self.added_labels: List[Tuple[str, int, str]] = []
        self.closed_issues: List[Tuple[str, int]] = []

    def track(self, url: str, status: str, content_id: Optional[str] = None) -> None:
        """Adds an item and sets its status, as the real client does."""
        item_id = self.add_item(url)
        self.edit_status(item_id, status)

    def add_item(self, url: str) -> str:
        """Records an item addition and returns a synthetic id."""
        item_id = f"item-{len(self.added_items) + 1}"
        self.added_items.append((url, item_id))
        return item_id

    def edit_status(self, item_id: str, status_name: str) -> bool:
        """Records a status change."""
        self.edited_statuses.append((item_id, status_name))
        return True

    def set_status_label(
        self,
        repo: str,
        issue_number: int,
        status_name: str,
        existing_labels: Optional[List[Any]] = None,
    ) -> None:
        """Records an exclusive status-label assignment."""
        self.status_labels.append((repo, issue_number, status_name))

    def add_issue_label(self, repo: str, issue_number: int, label: str) -> None:
        """Records a label addition, routing status labels through the exclusive setter."""
        if label in set(STATUS_NAMES):
            self.set_status_label(repo, issue_number, label)
            return
        self.added_labels.append((repo, issue_number, label))

    def close_issue(self, repo: str, issue_number: int, reason: str = "completed") -> None:
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
    # i3 already holds a status and is open, so it is left alone. i4 is closed with nothing to
    # say it finished, so it is settled as Dropped rather than skipped: a closed item's status is
    # a fact the board must agree with, not a judgement to preserve.
    assert client.writes == [("i1", "Backlog"), ("i2", "ToDo"), ("i4", "Dropped")]


def test_reconciliation_with_board_group():
    """Status reconciliation iterates over all boards in a BoardGroup."""
    from project_automation import BoardGroup, reconcile_unassigned_statuses

    items = {
        "items": [
            {"id": "i1", "labels": ["Backlog"], "content": {"title": "item1"}},
        ]
    }

    class Recorder(GitHubProjectClient):
        def __init__(self, num: int) -> None:
            super().__init__(owner="o", project_number=num)
            self.writes: List[Tuple[str, str]] = []

        def run_gh(self, args: List[str]) -> str:
            import json as _json

            return _json.dumps(items)

        def edit_status(self, item_id: str, status_name: str) -> bool:
            self.writes.append((item_id, status_name))
            return True

    b1, b2 = Recorder(1), Recorder(2)
    group = BoardGroup([b1, b2])
    reconcile_unassigned_statuses(group)
    assert b1.writes == [("i1", "Backlog")]
    assert b2.writes == [("i1", "Backlog")]

    # Empty BoardGroup completes without raising
    empty_group = BoardGroup([])
    reconcile_unassigned_statuses(empty_group)


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


class TestBoardResolution:
    """Boards come from the declaration, and a failed write is never reported as success."""

    def setup_method(self):
        """Clears failures recorded by an earlier test."""
        project_automation.FAILURES.clear()

    def test_an_item_reaches_every_declared_board(self):
        """A repository's own board and the global one are different projects."""
        first, second = FakeProjectClient(), FakeProjectClient()
        group = project_automation.BoardGroup([first, second])
        group.track("https://github.com/o/r/issues/1", "In Progress")
        assert [url for url, _ in first.added_items] == ["https://github.com/o/r/issues/1"]
        assert [url for url, _ in second.added_items] == ["https://github.com/o/r/issues/1"]

    def test_labels_and_closures_happen_once_not_once_per_board(self):
        """A label belongs to the issue, not to a board; applying it twice is wrong."""
        first, second = FakeProjectClient(), FakeProjectClient()
        group = project_automation.BoardGroup([first, second])
        group.set_status_label(REPO, 7, "Done")
        group.close_issue(REPO, 7)
        assert first.status_labels == [(REPO, 7, "Done")] and second.status_labels == []
        assert first.closed_issues == [(REPO, 7)] and second.closed_issues == []

    def test_board_group_delegates_run_gh(self):
        """A board group delegates command execution to its first client."""
        calls = []

        class RecordingClient(FakeProjectClient):
            def run_gh(self, args):
                calls.append(args)
                return "ok"

        group = project_automation.BoardGroup([RecordingClient()])
        assert group.run_gh(["issue", "list"]) == "ok"
        assert calls == [["issue", "list"]]

    def test_empty_board_group_run_gh_executes_subprocess(self, monkeypatch):
        """When no clients are present, BoardGroup executes subprocess directly."""
        seen = []
        monkeypatch.setattr(
            project_automation.subprocess,
            "run",
            lambda cmd, **kwargs: seen.append(cmd) or type("R", (), {"stdout": "done\n"})(),
        )
        group = project_automation.BoardGroup([])
        assert group.run_gh(["issue", "list"]) == "done"
        assert seen == [["gh", "issue", "list"]]

    def test_board_group_properties_and_single_actions(self):
        """BoardGroup forwards owner and project_number and adds labels once."""
        first, second = FakeProjectClient(), FakeProjectClient()
        first.owner = "custom-owner"
        first.project_number = 42
        group = project_automation.BoardGroup([first, second])
        assert group.owner == "custom-owner"
        assert group.project_number == 42
        group.add_issue_label(REPO, 10, "area:ci")
        assert first.added_labels == [(REPO, 10, "area:ci")]
        assert second.added_labels == []

    def test_a_declared_board_that_does_not_exist_is_a_failure(self, monkeypatch):
        """Silence here is what let every write fail unnoticed for days."""
        monkeypatch.setattr(
            project_automation.subprocess,
            "run",
            lambda *a, **k: type(
                "R", (), {"stdout": '{"projects": [{"title": "Global", "number": 17}]}'}
            )(),
        )

        class Loaded:
            project_title = "DarkFactory"
            global_board_title = "Global"

        monkeypatch.setitem(
            __import__("sys").modules,
            "manifest",
            type("M", (), {"load": staticmethod(lambda root: Loaded())}),
        )
        numbers = project_automation.resolve_boards("marius-patrik")
        assert numbers == [17]
        assert any("DarkFactory" in failure for failure in project_automation.FAILURES)

    def test_a_recorded_failure_makes_the_run_fail(self):
        """The whole point: a broken board must not report success."""
        project_automation._fail("adding https://example/1 to project 16: boom")
        assert project_automation.FAILURES


class TestSettledStatus:
    """A closed item's status is not a judgement; it is a fact the board must agree with."""

    def test_an_open_item_is_never_overridden(self):
        """An open item's status is exactly the judgement the board exists to record."""
        assert project_automation.settled_status(False, False, ["In Progress"]) is None

    def test_a_merged_pull_request_is_done(self):
        """Merging is the definition of finished."""
        assert project_automation.settled_status(True, True, []) == "Done"

    def test_closed_without_merging_is_dropped(self):
        """Closed without implementation is dropped, not done."""
        assert project_automation.settled_status(True, False, []) == "Dropped"

    @pytest.mark.parametrize("label", ["Done", "Superseded", "Dropped"])
    def test_a_terminal_label_is_believed(self, label):
        """An item closed as superseded must not be flattened into dropped."""
        assert project_automation.settled_status(True, False, [label]) == label

    def test_a_stale_in_progress_label_does_not_survive_closing(self):
        """The exact drift found on the board: closed items still showing In Progress."""
        assert project_automation.settled_status(True, False, ["In Progress"]) == "Dropped"


class TestTokenSelection:
    """Only Projects v2 needs a person's token; everything else belongs to the App."""

    def test_board_calls_use_the_project_token(self, monkeypatch):
        """Projects v2 permissions are org-scoped, so a user-owned board needs the user's token."""
        monkeypatch.setenv("GH_TOKEN", "app")
        monkeypatch.setenv("GH_PROJECT_TOKEN", "user")
        assert project_automation._env_for(["project", "item-list"])["GH_TOKEN"] == "user"

    @pytest.mark.parametrize("args", [["issue", "edit"], ["api", "repos/o/r"], ["pr", "view"]])
    def test_repository_calls_use_the_app_token(self, args, monkeypatch):
        """The quota that starved the automation was spent on exactly these calls."""
        monkeypatch.setenv("GH_TOKEN", "app")
        monkeypatch.setenv("GH_PROJECT_TOKEN", "user")
        assert project_automation._env_for(args)["GH_TOKEN"] == "app"

    def test_without_a_project_token_nothing_is_overridden(self, monkeypatch):
        """A repository that never configured one must still work as it did before."""
        monkeypatch.setenv("GH_TOKEN", "only")
        monkeypatch.delenv("GH_PROJECT_TOKEN", raising=False)
        assert project_automation._env_for(["project", "item-list"])["GH_TOKEN"] == "only"


class TestMembershipReconciliation:
    """A board is never wrong, only quietly incomplete; nothing looked twice until now."""

    def setup_method(self):
        """Clears failures recorded by an earlier test."""
        project_automation.FAILURES.clear()

    def _client(self, issues, prs):
        """Builds a recorder returning canned listings.

        Args:
            issues: Open issues to return.
            prs: Open pull requests to return.

        Returns:
            A client double recording every track call.
        """

        class Recorder(FakeProjectClient):
            def __init__(self):
                super().__init__()
                self.tracked = []

            def run_gh(self, args):
                import json as _json

                return _json.dumps(issues if args[0] == "issue" else prs)

            def track(self, url, status):
                self.tracked.append((url, status))

        return Recorder()

    def test_every_open_item_reaches_the_boards(self):
        """Both boards, because track goes through the group covering own and global."""
        client = self._client(
            [{"number": 1, "url": "https://x/issues/1", "labels": [{"name": "Backlog"}]}],
            [{"number": 2, "url": "https://x/pull/2", "labels": [], "isDraft": False}],
        )
        assert project_automation.reconcile_membership(client, "o/r") == 2
        assert ("https://x/issues/1", "Backlog") in client.tracked

    def test_an_open_pull_request_is_work_in_flight(self):
        """Whatever its labels say, an open pull request is not merely ToDo."""
        client = self._client([], [{"number": 2, "url": "https://x/pull/2", "labels": []}])
        project_automation.reconcile_membership(client, "o/r")
        assert client.tracked == [("https://x/pull/2", "In Progress")]

    def test_a_repository_with_nothing_open_tracks_nothing(self):
        """Reconciling a quiet repository must cost a listing and no writes."""
        client = self._client([], [])
        assert project_automation.reconcile_membership(client, "o/r") == 0
        assert client.tracked == []

    def test_a_failed_listing_is_recorded_rather_than_swallowed(self):
        """A silent failure here leaves a board incomplete and says nothing."""

        class Broken(FakeProjectClient):
            def run_gh(self, args):
                raise RuntimeError("boom")

            def track(self, url, status):
                pass

        project_automation.reconcile_membership(Broken(), "o/r")
        assert project_automation.FAILURES

    def test_membership_reconciliation_tracks_all_boards_in_group(self):
        """Membership reconciliation works with BoardGroup, tracking across all clients."""
        first = self._client(
            [{"number": 1, "url": "https://x/issues/1", "labels": [{"name": "Backlog"}]}],
            [],
        )
        second = self._client([], [])
        group = project_automation.BoardGroup([first, second])
        assert project_automation.reconcile_membership(group, "o/r") == 1
        assert ("https://x/issues/1", "Backlog") in first.tracked
        assert ("https://x/issues/1", "Backlog") in second.tracked

    def test_membership_reconciliation_with_empty_group(self, monkeypatch):
        """Reconciling with an empty BoardGroup runs without error."""
        monkeypatch.setattr(
            project_automation.subprocess,
            "run",
            lambda cmd, **kwargs: type("R", (), {"stdout": "[]"})(),
        )
        group = project_automation.BoardGroup([])
        assert project_automation.reconcile_membership(group, "o/r") == 0


class TestFailuresSayWhatWentWrong:
    """`str()` of a subprocess failure names the command and the exit status and nothing else."""

    def test_captured_stderr_reaches_the_message(self):
        """The line explaining the failure is the line that was being dropped."""
        exc = subprocess.CalledProcessError(
            1, ["gh", "project", "list"], stderr="unknown owner type\n"
        )
        detail = project_automation._detail(exc)
        assert "unknown owner type" in detail
        assert "returned non-zero exit status 1" in detail

    def test_stdout_is_used_when_there_is_no_stderr(self):
        """`gh` does not always fail on stderr."""
        exc = subprocess.CalledProcessError(1, ["gh"], output="API rate limit already exceeded")
        assert "API rate limit already exceeded" in project_automation._detail(exc)

    def test_bytes_output_does_not_break_the_message(self):
        """A failure reported without `text=True` must still be readable."""
        exc = subprocess.CalledProcessError(1, ["gh"], stderr=b"boom\n")
        assert "boom" in project_automation._detail(exc)

    def test_an_exception_with_no_output_renders_as_itself(self):
        """Most exceptions carry nothing captured, and must not gain empty parentheses."""
        assert project_automation._detail(ValueError("plain")) == "plain"


class TestRateLimitingAndIncrementalBudget:
    """Rate limits must pause cleanly without failing, and writes must be idempotent and budgeted."""

    def test_is_rate_limited_recognises_indicators(self):
        """Standard rate-limit messages across GraphQL and REST are detected."""
        for phrase in [
            "unknown owner type",
            "API rate limit exceeded",
            "secondary rate limit",
            "was submitted too quickly",
            "too many requests",
            "quota exceeded",
        ]:
            exc = subprocess.CalledProcessError(1, ["gh"], stderr=phrase)
            assert project_automation.is_rate_limited(exc)

    def test_resolve_boards_pauses_on_rate_limit(self, monkeypatch):
        """When listing projects hits a rate limit, RATE_LIMITED is set and FAILURES is empty."""
        monkeypatch.setattr(project_automation, "FAILURES", [])
        monkeypatch.setattr(project_automation, "RATE_LIMITED", False)
        monkeypatch.setattr(
            project_automation.subprocess,
            "run",
            lambda *a, **k: (_ for _ in ()).throw(
                subprocess.CalledProcessError(1, ["gh"], stderr="unknown owner type")
            ),
        )
        boards = project_automation.resolve_boards()
        assert boards == []
        assert project_automation.RATE_LIMITED is True
        assert project_automation.FAILURES == []

    def test_track_skips_when_item_already_matches(self, monkeypatch):
        """Check-before-write idempotency: no mutations when status already matches."""
        client = GitHubProjectClient(project_number=10)
        client._items_cache = {"https://github.com/o/r/issues/1": ("item-1", "Done")}
        monkeypatch.setattr(
            client, "edit_status", lambda item_id, st: pytest.fail("should not mutate")
        )
        monkeypatch.setattr(client, "add_item", lambda url: pytest.fail("should not add"))
        client.track("https://github.com/o/r/issues/1", "Done")

    def test_track_edits_without_add_when_status_differs(self, monkeypatch):
        """When an item is already present with a different status, only edit_status is called."""
        client = GitHubProjectClient(project_number=10)
        client._items_cache = {"https://github.com/o/r/issues/1": ("item-1", "ToDo")}
        edited = []
        monkeypatch.setattr(client, "add_item", lambda url: pytest.fail("should not add"))
        monkeypatch.setattr(
            client, "edit_status", lambda item_id, st: edited.append((item_id, st)) or True
        )
        client.track("https://github.com/o/r/issues/1", "In Progress")
        assert edited == [("item-1", "In Progress")]

    def test_track_respects_mutation_budget(self, monkeypatch):
        """When the mutation budget is reached, further writes are deferred."""
        monkeypatch.setattr(project_automation, "MUTATIONS_PERFORMED", 5)
        monkeypatch.setattr(project_automation, "MUTATION_BUDGET", 5)
        client = GitHubProjectClient(project_number=10)
        client._items_cache = {}
        monkeypatch.setattr(client, "add_item", lambda url: pytest.fail("budget exceeded"))
        client.track("https://github.com/o/r/issues/99", "ToDo")

    def test_historical_closed_items_reconciliation(self):
        """Reconciliation tracks historical closed issues and PRs with settled statuses."""
        issues = [
            {
                "number": 1,
                "url": "https://x/issues/1",
                "state": "CLOSED",
                "stateReason": "COMPLETED",
                "labels": [{"name": "Done"}],
            },
            {
                "number": 2,
                "url": "https://x/issues/2",
                "state": "CLOSED",
                "stateReason": "NOT_PLANNED",
                "labels": [],
            },
            {
                "number": 3,
                "url": "https://x/issues/3",
                "state": "OPEN",
                "labels": [{"name": "Backlog"}],
            },
        ]
        prs = [
            {
                "number": 4,
                "url": "https://x/pull/4",
                "state": "MERGED",
                "mergedAt": "2026-01-01T00:00:00Z",
                "labels": [],
            },
            {
                "number": 5,
                "url": "https://x/pull/5",
                "state": "CLOSED",
                "labels": [],
            },
        ]

        class Recorder(FakeProjectClient):
            def __init__(self):
                super().__init__()
                self.tracked = []

            def run_gh(self, args):
                import json as _json

                return _json.dumps(issues if args[0] == "issue" else prs)

            def track(self, url, status):
                self.tracked.append((url, status))

        client = Recorder()
        count = project_automation.reconcile_membership(client, "o/r")
        assert count == 5
        assert ("https://x/issues/1", "Done") in client.tracked
        assert ("https://x/issues/2", "Dropped") in client.tracked
        assert ("https://x/issues/3", "Backlog") in client.tracked
        assert ("https://x/pull/4", "Done") in client.tracked
        assert ("https://x/pull/5", "Dropped") in client.tracked

    def test_reconcile_unassigned_statuses_overrides_stale_in_progress_with_done_label(self):
        """Stale In Progress on a completed item with Done label is updated to Done."""
        from project_automation import reconcile_unassigned_statuses

        items = {
            "items": [
                {
                    "id": "item-96",
                    "status": "In Progress",
                    "labels": ["Request", "Done"],
                    "content": {"title": "record in architecture", "number": 96},
                },
                {
                    "id": "item-196",
                    "status": "In Progress",
                    "labels": ["Done"],
                    "content": {"title": "secondary harness tokens", "number": 196},
                },
            ]
        }

        class Recorder(GitHubProjectClient):
            def __init__(self):
                super().__init__(owner="o", project_number=17)
                self.writes = []

            def run_gh(self, args):
                import json as _json

                return _json.dumps(items)

            def edit_status(self, item_id, status_name):
                self.writes.append((item_id, status_name))
                return True

        client = Recorder()
        reconcile_unassigned_statuses(client)
        assert client.writes == [("item-96", "Done"), ("item-196", "Done")]

    def test_push_to_darkfactory_branch_closes_issues(self):
        """Pushes to darkfactory branch are recognized when default_branch is darkfactory."""
        client = FakeProjectClient()
        payload = {
            "ref": "refs/heads/darkfactory",
            "repository": {"full_name": REPO, "default_branch": "darkfactory"},
            "commits": [{"message": "fix(ci): fix darkfactory automation\n\nCloses #68"}],
        }
        process_event("push", payload, client=client)
        assert client.status_labels == [(REPO, 68, "Done")]
        assert client.closed_issues == [(REPO, 68)]
