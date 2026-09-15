"""Scheduled quota resume sweep.

Periodically checks repository variables for quota blocks that have reset and dispatches
resume events to the agent.
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from typing import List


def _list_variables(repo: str) -> List[dict]:
    """Return list of variable objects from `gh api`.
    Each object is expected to have at least ``name`` and ``value`` keys.
    """
    result = subprocess.run(
        ["gh", "api", "variables", f"repos/{repo}/actions/variables", "--paginate"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        print(f"Failed to list variables: {result.stderr}", file=sys.stderr)
        return []
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        print("Unable to parse gh api output as JSON", file=sys.stderr)
        return []


def _delete_variable(repo: str, name: str) -> None:
    subprocess.run(
        ["gh", "api", f"repos/{repo}/actions/variables", name, "-X", "DELETE"],
        capture_output=True,
        text=True,
        check=False,
    )


def _dispatch_resume(repo: str, item: int, is_pr: bool) -> None:
    payload = {"stage": "resume", "item": item, "is_pr": is_pr}
    subprocess.run(
        [
            "gh",
            "api",
            "dispatches",
            f"repos/{repo}/dispatches",
            "-f",
            "event_type=agent-dispatch",
            "-f",
            "client_payload",
            json.dumps(payload),
        ],
        capture_output=True,
        text=True,
        check=False,
    )


def sweep(repo: str, now: datetime, gh=None) -> List[int]:
    """Check quota variables and resume those whose reset time has passed.

    Args:
        repo: ``owner/name`` repository identifier.
        now: Current datetime (UTC) for comparison.
        gh: Unused placeholder kept for signature compatibility.
    Returns:
        List of resumed item numbers.
    """
    resumed: List[int] = []
    for var in _list_variables(repo):
        name = var.get("name", "")
        if not name.startswith("DF_QUOTA_"):
            continue
        value = var.get("value", "")
        try:
            data = json.loads(value)
        except Exception:
            print(f"Unparseable quota variable {name}, deleting", file=sys.stderr)
            _delete_variable(repo, name)
            continue
        reset_at_str = data.get("reset_at")
        try:
            reset_at = datetime.fromisoformat(reset_at_str.replace("Z", "+00:00")).replace(
                tzinfo=timezone.utc
            )
        except Exception:
            print(f"Invalid reset_at in {name}, deleting", file=sys.stderr)
            _delete_variable(repo, name)
            continue
        if reset_at <= now:
            item = data.get("item")
            is_pr = bool(data.get("is_pr"))
            _dispatch_resume(repo, item, is_pr)
            _delete_variable(repo, name)
            resumed.append(item)
    return resumed


def main() -> None:
    repo = os.getenv("GITHUB_REPOSITORY")
    if not repo:
        print("GITHUB_REPOSITORY not set", file=sys.stderr)
        sys.exit(1)
    now = datetime.now(timezone.utc)
    resumed = sweep(repo, now)
    if resumed:
        print(f"Resumed items: {', '.join(map(str, resumed))}")
    else:
        print("No quota variables resumed")


if __name__ == "__main__":
    main()
