"""Tests for the scheduled quota resume sweep."""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../.github/scripts")))

import quota_resume  # noqa: E402

NOW = datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc)
REPO = "owner/repo"


class FakeGh:
    """Records gh calls and answers the variables listing; no network."""

    def __init__(self, variables, fail_dispatch=False):
        self.variables = variables
        self.fail_dispatch = fail_dispatch
        self.calls = []
        self.dispatched = []

    def __call__(self, args):
        self.calls.append(args)
        if args[1].startswith(f"repos/{REPO}/actions/variables?"):
            return json.dumps({"total_count": len(self.variables), "variables": self.variables})
        if args[1] == f"repos/{REPO}/dispatches":
            if self.fail_dispatch:
                raise subprocess.CalledProcessError(1, ["gh", "api"], stderr="HTTP 403")
            with open(args[-1], encoding="utf-8") as handle:
                self.dispatched.append(json.load(handle))
        return ""

    def deleted(self):
        return [call[-1].rsplit("/", 1)[-1] for call in self.calls if "DELETE" in call]


def record(item, reset_at, is_pr=False):
    return json.dumps(
        {"item": item, "is_pr": is_pr, "reset_at": reset_at, "blocked_at": "2026-09-15T09:00:00Z"}
    )


def test_a_due_block_is_resumed_and_its_variable_deleted():
    gh = FakeGh([{"name": "DF_QUOTA_111", "value": record(42, "2026-09-15T11:59:00Z", is_pr=True)}])
    assert quota_resume.sweep(REPO, NOW, gh) == [42]
    assert gh.dispatched == [
        {
            "event_type": "agent-dispatch",
            "client_payload": {"stage": "resume", "item": 42, "is_pr": True},
        }
    ]
    assert gh.deleted() == ["DF_QUOTA_111"]


def test_a_block_that_has_not_reset_is_left_alone():
    gh = FakeGh([{"name": "DF_QUOTA_222", "value": record(7, "2026-09-15T13:00:00Z")}])
    assert quota_resume.sweep(REPO, NOW, gh) == []
    assert gh.dispatched == [] and gh.deleted() == []


def test_an_unreadable_record_is_deleted_and_other_variables_ignored():
    gh = FakeGh(
        [
            {"name": "DF_QUOTA_333", "value": "not json"},
            {"name": "DARKFACTORY_QUOTA_PROVIDERS", "value": "{}"},
            {"name": "SOMETHING_ELSE", "value": record(1, "2026-09-01T00:00:00Z")},
        ]
    )
    assert quota_resume.sweep(REPO, NOW, gh) == []
    assert gh.deleted() == ["DF_QUOTA_333"]


def test_a_failed_dispatch_keeps_the_record_for_the_next_sweep():
    gh = FakeGh(
        [{"name": "DF_QUOTA_444", "value": record(9, "2026-09-15T10:00:00Z")}], fail_dispatch=True
    )
    assert quota_resume.sweep(REPO, NOW, gh) == []
    assert gh.deleted() == []
