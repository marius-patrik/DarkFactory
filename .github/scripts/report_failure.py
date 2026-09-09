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

#: Set when this script could not do its job, so `main` can exit non-zero.
#:
#: Reporting a failure is itself a pipeline step, and a step that swallows its own errors is the
#: very thing this script exists to surface. Filing an issue can fail for ordinary reasons - a
#: missing label, a revoked token - and if that were logged and forgotten the pipeline would once
#: again be quietly unable to tell anyone it is broken.
FAILED = False

#: Label carried by every issue this script opens, so they can be found and filtered as a set.
FAILURE_LABEL = "pipeline-failure"

#: Hidden marker naming the workflow an issue belongs to.
#:
#: Identity lives in the body rather than the title so that renaming an issue by hand - or an
#: agent rewording it - does not cause the next failure to open a second one.
MARKER = "<!-- pipeline-failure: {workflow} -->"


def _record(message: str) -> None:
    """Reports that this script could not do its job, and remembers it.

    Args:
        message: What could not be done.
    """
    global FAILED
    FAILED = True
    print(f"Error: {message}", file=sys.stderr)


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
        _record(f"could not list issues on {repo}: {exc}")
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


def _close_duplicates(repo: str, workflow: str, keep: int) -> int:
    """Closes any extra issues covering the same workflow.

    Two runs finishing together both find nothing open and both file, because the check and the
    create are not atomic. A concurrency group would serialise them, but a queued run is cancelled
    when another joins its group, and a cancelled observer is a failure nobody hears about - which
    is the thing this workflow exists to prevent.

    So filing stays unserialised and the duplicate is cleaned up afterwards. The lowest number is
    kept, because that is the one whose comments people will have replied to.

    Args:
        repo: `owner/name` of the repository.
        workflow: Workflow name.
        keep: Issue number to keep.

    Returns:
        How many duplicates were closed.
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
        _record(f"could not list issues while de-duplicating {workflow}: {exc}")
        return 0

    closed = 0
    for issue in json.loads(output or "[]"):
        number = int(issue["number"])
        if number == keep or marker not in (issue.get("body") or ""):
            continue
        try:
            _gh(
                [
                    "issue",
                    "close",
                    str(number),
                    "--repo",
                    repo,
                    "--comment",
                    f"Duplicate of #{keep}; both runs filed before either saw the other.",
                ]
            )
            print(f"Closed duplicate #{number} of #{keep}.")
            closed += 1
        except subprocess.CalledProcessError as exc:
            _record(f"could not close duplicate #{number}: {exc}")
    return closed


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
            _record(f"could not comment on #{existing}: {exc}")
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
        number = int(url.rstrip("/").rsplit("/", 1)[-1])
        print(f"Opened {url} for {workflow}.")
        # Another run may have filed between the check above and this create.
        _close_duplicates(repo, workflow, keep=number)
        return number
    except subprocess.CalledProcessError as exc:
        _record(f"could not open an issue for {workflow}: {exc}")
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
        _record(f"could not close #{existing}: {exc}")


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

    if FAILED:
        sys.exit(1)


if __name__ == "__main__":
    main()
