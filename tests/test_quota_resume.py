import json
import sys
from datetime import datetime, timezone
from unittest import mock
import os
import pathlib
import importlib.util
import pytest

# Load the quota_resume module from its file path
module_path = pathlib.Path(__file__).parents[1] / ".github" / "scripts" / "quota_resume.py"
spec = importlib.util.spec_from_file_location("quota_resume", module_path)
quota_resume = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quota_resume)


def fake_subprocess_run_factory(calls):
    """Factory that returns a mock subprocess.run function recording calls."""

    def _run(args, capture_output=False, text=False, check=False, **kwargs):
        # Record the call for inspection
        calls.append(args)
        # Simulate behavior based on the command
        cmd = args[0]
        if cmd != "gh":
            raise RuntimeError("Only gh commands expected")
        # List variables command
        if "variables" in args and "--paginate" in args:
            # Return a JSON list of variable objects
            data = [
                {
                    "name": "DF_QUOTA_1",
                    "value": json.dumps(
                        {"item": 1, "is_pr": False, "reset_at": "2023-01-01T00:00:00Z"}
                    ),
                },
                {
                    "name": "DF_QUOTA_2",
                    "value": json.dumps(
                        {"item": 2, "is_pr": True, "reset_at": "2099-01-01T00:00:00Z"}
                    ),
                },
                {"name": "DF_QUOTA_BAD", "value": "{not json}"},
                {"name": "OTHER_VAR", "value": "something"},
            ]
            mock_obj = mock.Mock()
            mock_obj.returncode = 0
            mock_obj.stdout = json.dumps(data)
            mock_obj.stderr = ""
            return mock_obj
        # Dispatch or delete commands just succeed
        mock_obj = mock.Mock()
        mock_obj.returncode = 0
        mock_obj.stdout = ""
        mock_obj.stderr = ""
        return mock_obj

    return _run


def test_sweep_resumes_and_cleans_up(monkeypatch):
    calls = []
    monkeypatch.setattr("subprocess.run", fake_subprocess_run_factory(calls))
    now = datetime(2023, 1, 2, tzinfo=timezone.utc)
    resumed = quota_resume.sweep("owner/repo", now)
    # Expect only item 1 to be resumed
    assert resumed == [1]
    # Verify that a dispatch was made for item 1
    dispatch_calls = [c for c in calls if "dispatches" in c]
    assert any("client_payload" in c for c in dispatch_calls)
    # Verify that delete was called for DF_QUOTA_1 and DF_QUOTA_BAD
    delete_calls = [c for c in calls if "-X" in c]
    assert any("DF_QUOTA_1" in c for c in delete_calls)
    assert any("DF_QUOTA_BAD" in c for c in delete_calls)
    # Ensure DF_QUOTA_2 was not deleted
    assert not any("DF_QUOTA_2" in c for c in delete_calls)


def test_main_prints_output(monkeypatch, capsys):
    # Patch env and subprocess
    monkeypatch.setenv("GITHUB_REPOSITORY", "owner/repo")
    calls = []
    monkeypatch.setattr("subprocess.run", fake_subprocess_run_factory(calls))
    # Run main
    quota_resume.main()
    captured = capsys.readouterr()
    assert "Resumed items: 1" in captured.out
