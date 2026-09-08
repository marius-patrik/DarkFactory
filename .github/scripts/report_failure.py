"""Turns a failed pipeline run into an issue.

A red run scrolls away. Nobody watches the Actions tab of a repository that is supposed to look
after itself, and a failure that only exists as a run is a failure nobody acts on - the board
automation wrote to the wrong project for days while reporting success, and was found by hand.

So a failure becomes the same artefact as any other piece of work: an issue, labelled and routed
like the rest, which lands on the board and is closed when the workflow next succeeds.

Deduplication is the part that matters. A workflow failing on every push must produce one issue
that gains comments, not an issue per push, or the cure is worse than the disease. The workflow
name is the identity: one open issue per failing workflow, found by a marker in the body rather
than by title, so retitling by hand does not spawn a duplicate.

Environment:
    GH_TOKEN: Token with `issues` scope.
    GITHUB_REPOSITORY: `owner/name` of the repository.
    WORKFLOW_NAME: Name of the workflow that failed.
    RUN_URL: Link to the failing run.
    RUN_ID: Identifier of the failing run.
    CONCLUSION: Conclusion of the run; anything but `failure` closes instead of opening.
"""

import json
import os
import subprocess
import sys
from typing import List, Optional

#: Label carried by every issue this script opens, so they can be found and filtered as a set.
FAILURE_LABEL = "pipeline-failure"

#: Hidden marker naming the workflow an issue belongs to.
#:
#: Identity lives in the body rather than the title so that renaming an issue by hand - or an
#: agent rewording it - does not cause the next failure to open a second one.
MARKER = "<!-- pipeline-failure: {workflow} -->"


def _gh(args: List[str]) -> str:
    """Runs a ``gh`` command and returns stripped stdout.

    Args:
        args: Arguments following the ``gh`` executable.

    Returns:
        Command stdout with surrounding whitespace removed.

    Raises:
        subprocess.CalledProcessError: When the command fails.
    """
    return subprocess.run(["gh", *args], capture_output=True, text=True, check=True).stdout.strip()


def find_open_issue(repo: str, workflow: str) -> Optional[int]:
    """Finds the open failure issue for a workflow, if one exists.

    Args:
        repo: `owner/name` of the repository.
        workflow: Workflow name.

    Returns:
        Issue number, or `None` when no open issue covers this workflow.
    """
    marker = MARKER.format(workflow=workflow)
    try:
        output = _gh(
            [
                "issue",
                "list",
                "--repo",
                repo,
                "--state",
                "open",
                "--label",
                FAILURE_LABEL,
                "--limit",
                "100",
                "--json",
                "number,body",
            ]
        )
    except subprocess.CalledProcessError as exc:
        print(f"Could not list issues: {exc}", file=sys.stderr)
        return None
    for issue in json.loads(output or "[]"):
        if marker in (issue.get("body") or ""):
            return int(issue["number"])
    return None


def body_for(workflow: str, run_url: str, run_id: str) -> str:
    """Builds the issue body.

    Args:
        workflow: Workflow name.
        run_url: Link to the failing run.
        run_id: Identifier of the failing run.

    Returns:
        Markdown body carrying the marker.
    """
    return (
        f"{MARKER.format(workflow=workflow)}\n\n"
        f"The **{workflow}** workflow failed.\n\n"
        f"- Run: {run_url}\n"
        f"- Run id: `{run_id}`\n\n"
        "This issue was opened by the pipeline itself and closes automatically when "
        f"**{workflow}** next succeeds on the default branch."
    )


def report(repo: str, workflow: str, run_url: str, run_id: str) -> Optional[int]:
    """Opens or updates the issue for a failing workflow.

    Args:
        repo: `owner/name` of the repository.
        workflow: Workflow name.
        run_url: Link to the failing run.
        run_id: Identifier of the failing run.

    Returns:
        The issue number, or `None` when it could not be filed.
    """
    existing = find_open_issue(repo, workflow)
    if existing is not None:
        try:
            _gh(
                [
                    "issue",
                    "comment",
                    str(existing),
                    "--repo",
                    repo,
                    "--body",
                    f"Failed again: {run_url}",
                ]
            )
            print(f"Commented on #{existing} for {workflow}.")
            return existing
        except subprocess.CalledProcessError as exc:
            print(f"Could not comment on #{existing}: {exc}", file=sys.stderr)
            return None

    try:
        url = _gh(
            [
                "issue",
                "create",
                "--repo",
                repo,
                "--title",
                f"Pipeline failure: {workflow}",
                "--label",
                FAILURE_LABEL,
                "--body",
                body_for(workflow, run_url, run_id),
            ]
        )
        print(f"Opened {url} for {workflow}.")
        return int(url.rstrip("/").rsplit("/", 1)[-1])
    except subprocess.CalledProcessError as exc:
        print(f"Could not open an issue: {exc}", file=sys.stderr)
        return None


def resolve(repo: str, workflow: str) -> None:
    """Closes the failure issue for a workflow that has succeeded again.

    Args:
        repo: `owner/name` of the repository.
        workflow: Workflow name.
    """
    existing = find_open_issue(repo, workflow)
    if existing is None:
        return
    try:
        _gh(
            [
                "issue",
                "close",
                str(existing),
                "--repo",
                repo,
                "--comment",
                f"**{workflow}** succeeded again; closing.",
            ]
        )
        print(f"Closed #{existing}: {workflow} is green again.")
    except subprocess.CalledProcessError as exc:
        print(f"Could not close #{existing}: {exc}", file=sys.stderr)


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Entry point: reads the run's outcome from the environment."""
    repo = os.environ.get("GITHUB_REPOSITORY", "")
    workflow = os.environ.get("WORKFLOW_NAME", "")
    conclusion = os.environ.get("CONCLUSION", "")
    if not repo or not workflow:
        print("GITHUB_REPOSITORY and WORKFLOW_NAME are both required.", file=sys.stderr)
        return
    if conclusion == "failure":
        report(repo, workflow, os.environ.get("RUN_URL", ""), os.environ.get("RUN_ID", ""))
    else:
        resolve(repo, workflow)


if __name__ == "__main__":
    main()
