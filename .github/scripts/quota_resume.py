"""Scheduled resume sweep for runs that stopped on quota.

When every model is out of quota the agent runner records the blocked item in a repository variable
``DF_QUOTA_<run-id>`` holding ``{"item", "is_pr", "reset_at", "blocked_at"}``. This sweep runs on a
schedule, and for every variable whose ``reset_at`` has passed it sends the ``agent-dispatch``
``resume`` stage for that item and deletes the variable. A dispatch that fails keeps the variable,
so the next sweep tries again.
"""

import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

VARIABLE_PREFIX = "DF_QUOTA_"


def run_gh(args: List[str]) -> str:
    """Runs a gh CLI command and returns its stdout.

    Args:
        args: Arguments after ``gh``.

    Returns:
        The command's standard output, stripped.

    Raises:
        subprocess.CalledProcessError: When the command fails; the message carries stderr.
    """
    result = subprocess.run(["gh", *args], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise subprocess.CalledProcessError(
            result.returncode, ["gh", *args[:3]], output=result.stdout, stderr=result.stderr
        )
    return result.stdout.strip()


def list_quota_variables(repo: str, gh: Callable[[List[str]], str]) -> List[Dict[str, Any]]:
    """Lists the repository variables that record quota-blocked runs.

    Args:
        repo: Repository slug (``owner/name``).
        gh: gh runner returning stdout.

    Returns:
        Variable objects (``name``, ``value``) whose name starts with ``DF_QUOTA_``.
    """
    variables: List[Dict[str, Any]] = []
    page = 1
    while True:
        raw = gh(["api", f"repos/{repo}/actions/variables?per_page=100&page={page}"])
        batch = (json.loads(raw) if raw else {}).get("variables", [])
        variables.extend(batch)
        if len(batch) < 100:
            break
        page += 1
    return [item for item in variables if str(item.get("name", "")).startswith(VARIABLE_PREFIX)]


def dispatch_resume(repo: str, item: int, is_pr: bool, gh: Callable[[List[str]], str]) -> None:
    """Sends the ``agent-dispatch`` ``resume`` stage for one item.

    Args:
        repo: Repository slug.
        item: Issue or pull request number.
        is_pr: Whether the item is a pull request.
        gh: gh runner returning stdout.

    Raises:
        subprocess.CalledProcessError: When GitHub rejects the dispatch.
    """
    body = {
        "event_type": "agent-dispatch",
        "client_payload": {"stage": "resume", "item": item, "is_pr": is_pr},
    }
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as handle:
        json.dump(body, handle)
        path = handle.name
    try:
        gh(["api", f"repos/{repo}/dispatches", "--method", "POST", "--input", path])
    finally:
        os.remove(path)


def sweep(repo: str, now: datetime, gh: Optional[Callable[[List[str]], str]] = None) -> List[int]:
    """Resumes every quota-blocked run whose reset time has passed.

    Args:
        repo: Repository slug.
        now: Current time (timezone-aware UTC).
        gh: gh runner returning stdout; defaults to the real CLI.

    Returns:
        The item numbers that were resumed.
    """
    runner = gh or run_gh
    resumed: List[int] = []
    for variable in list_quota_variables(repo, runner):
        name = variable["name"]
        try:
            record = json.loads(variable.get("value") or "")
            item = int(record["item"])
            reset_at = datetime.fromisoformat(str(record["reset_at"]).replace("Z", "+00:00"))
        except (ValueError, KeyError, TypeError) as error:
            print(f"Notice: deleting unreadable quota record {name}: {error}", file=sys.stderr)
            runner(["api", "--method", "DELETE", f"repos/{repo}/actions/variables/{name}"])
            continue
        if reset_at > now:
            continue
        try:
            dispatch_resume(repo, item, bool(record.get("is_pr")), runner)
        except subprocess.CalledProcessError as error:
            print(
                f"Notice: resume dispatch for #{item} failed, keeping {name}: {error.stderr or error}",
                file=sys.stderr,
            )
            continue
        runner(["api", "--method", "DELETE", f"repos/{repo}/actions/variables/{name}"])
        resumed.append(item)
    return resumed


def main() -> int:
    """Runs one sweep for ``GITHUB_REPOSITORY`` and reports what it resumed.

    Returns:
        Process exit code.
    """
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    if not repo:
        print("GITHUB_REPOSITORY is not set", file=sys.stderr)
        return 1
    resumed = sweep(repo, datetime.now(timezone.utc))
    print(
        f"Resumed {len(resumed)} quota-blocked item(s): {', '.join(f'#{n}' for n in resumed) or 'none'}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
