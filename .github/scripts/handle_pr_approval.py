"""Pull request approval and auto-merge automation.

Listens for maintainer approvals (native review or an approval comment), transitions the draft PR to
ready, submits a proxy approval when the branch protection still demands one, enables auto-merge with
branch auto-deletion, and reconciles bound issues and the project board to ``Done`` after the merge
lands.

Board mutations are delegated to :mod:`project_automation`, so field and option ids are resolved at
runtime rather than hardcoded.
"""

import json
import os
import re
import subprocess
import sys
import time
from typing import Any, Dict, List, Optional, Set

_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from project_automation import (  # noqa: E402
    CLOSING_PATTERN,
    GitHubProjectClient,
    extract_bound_issues,
)

#: Comment bodies that count as an approval when posted by the maintainer.
APPROVAL_COMMENT = re.compile(r"(?i)^\s*(?:/approve|approve|merge|/merge|lgtm)\s*$")

#: Free-text approval detection inside a submitted review body.
APPROVAL_REVIEW_TEXT = re.compile(r"(?i)\b(?:approve|approved|merge)\b")

#: Seconds between merge-completion polls, and how many polls to attempt.
MERGE_POLL_INTERVAL_SECONDS = 5
MERGE_POLL_ATTEMPTS = 12


def _gh(
    args: List[str], repo: str, check: bool = False, as_bot: bool = False
) -> subprocess.CompletedProcess:
    """Runs a ``gh`` command scoped to a repository.

    Args:
        args: Arguments following the ``gh`` executable.
        repo: Repository slug (``owner/name``).
        check: Raise on non-zero exit when ``True``.
        as_bot: Run with ``BOT_TOKEN`` instead of ``GH_TOKEN``. Required for submitting the proxy
            review: ``GH_TOKEN`` is the maintainer's token, and GitHub refuses to let an author
            approve their own pull request, so an approval sent with it fails silently.

    Returns:
        The completed process.
    """
    env = dict(os.environ, GH_REPO=repo)
    if as_bot:
        bot_token = os.environ.get("BOT_TOKEN", "")
        if bot_token:
            env["GH_TOKEN"] = bot_token
    return subprocess.run(["gh"] + args, capture_output=True, text=True, check=check, env=env)


def submit_proxy_review(pr_number: int, repo: str, actor: str) -> bool:
    """Submits the bot's approving review and verifies that it landed.

    Branch protection requires one approving review. Pull requests are opened with a token belonging
    to the maintainer, so the maintainer cannot approve them — GitHub rejects self-approval. The
    approval therefore has to come from ``github-actions[bot]``, which requires the repository's
    ``can_approve_pull_request_reviews`` permission and a ``BOT_TOKEN`` distinct from ``GH_TOKEN``.

    The result is verified rather than assumed: a failed approval used to leave the pull request
    stuck at ``REVIEW_REQUIRED`` with auto-merge armed and nothing in the log to explain it.

    Args:
        pr_number: Pull request number.
        repo: Repository slug (``owner/name``).
        actor: Login of the maintainer whose approval is being proxied.

    Returns:
        ``True`` when an approving review exists after the attempt.
    """
    if not os.environ.get("BOT_TOKEN"):
        print(
            "BOT_TOKEN is not set. The proxy approval would be sent as the pull request's own "
            "author and rejected as self-approval; skipping. Set BOT_TOKEN to "
            "secrets.GITHUB_TOKEN in the workflow.",
            file=sys.stderr,
        )
        return False

    print(f"Submitting approving review as the bot on PR #{pr_number}...")
    result = _gh(
        [
            "pr",
            "review",
            str(pr_number),
            "--approve",
            "-b",
            f"Approved via automation on behalf of @{actor}.",
        ],
        repo,
        as_bot=True,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip().splitlines()
        print(
            f"Proxy approval FAILED: {detail[0] if detail else 'unknown error'}",
            file=sys.stderr,
        )

    check = _gh(["api", f"repos/{repo}/pulls/{pr_number}/reviews", "--jq", ".[].state"], repo)
    approved = "APPROVED" in (check.stdout or "")
    if not approved:
        print(
            f"PR #{pr_number} still has no approving review. Auto-merge will stay armed but the "
            f"pull request cannot merge until one is submitted.",
            file=sys.stderr,
        )
    return approved


def collect_bound_issues(pr_data: Dict[str, Any]) -> List[int]:
    """Collects bound issue numbers from both GitHub's link graph and the PR body.

    GitHub's ``closingIssuesReferences`` is authoritative but only populated for well-formed
    references in the current body; the regex pass catches cross-repository urls and edits that
    have not propagated yet.

    Args:
        pr_data: Result of ``gh pr view --json state,closingIssuesReferences,body,url``.

    Returns:
        Sorted list of unique issue numbers.
    """
    issue_numbers: Set[int] = set()
    for ref in pr_data.get("closingIssuesReferences", []) or []:
        if "number" in ref:
            issue_numbers.add(int(ref["number"]))
    for short_ref, url_ref in CLOSING_PATTERN.findall(pr_data.get("body", "") or ""):
        num = short_ref or url_ref
        if num:
            issue_numbers.add(int(num))
    return sorted(issue_numbers)


def reconcile_post_merge(
    pr_number: int, repo: str, client: Optional[GitHubProjectClient] = None
) -> None:
    """Closes bound issues and moves the PR and its issues to ``Done`` on the board.

    Args:
        pr_number: Pull request number.
        repo: Repository slug (``owner/name``).
        client: Optional injected project client, used by tests.
    """
    view = _gh(
        ["pr", "view", str(pr_number), "--json", "state,closingIssuesReferences,body,url"], repo
    )
    if view.returncode != 0:
        print(f"Failed to view PR #{pr_number} for post-merge reconciliation.")
        return

    data = json.loads(view.stdout)
    if data.get("state") != "MERGED":
        print(f"PR #{pr_number} state is {data.get('state')}, not MERGED.")
        return

    if client is None:
        client = GitHubProjectClient()

    issue_numbers = collect_bound_issues(data)
    print(f"Reconciling post-merge for PR #{pr_number}. Bound issues: {issue_numbers}")

    pr_url = data.get("url")
    if pr_url:
        item_id = client.add_item(pr_url)
        if item_id:
            client.edit_status(item_id, "Done")

    for num in issue_numbers:
        _gh(["issue", "close", str(num), "--repo", repo, "--reason", "completed"], repo)
        client.set_status_label(repo, num, "Done")
        item_id = client.add_item(f"https://github.com/{repo}/issues/{num}")
        if item_id:
            client.edit_status(item_id, "Done")
        print(f"Closed issue #{num} and marked it Done on the project board")


def detect_approval() -> tuple[Optional[str], bool]:
    """Determines whether the current event is a maintainer approval.

    Returns:
        Tuple of ``(pr_number, is_approved)``; ``pr_number`` is ``None`` when the event carries none.
    """
    event_name = os.environ.get("GITHUB_EVENT_NAME", "")

    if event_name == "pull_request_review":
        pr_number = os.environ.get("PR_NUMBER")
        state = os.environ.get("REVIEW_STATE", "").upper()
        body = os.environ.get("REVIEW_BODY", "").strip()
        return pr_number, state == "APPROVED" or bool(APPROVAL_REVIEW_TEXT.search(body))

    if event_name == "issue_comment":
        if os.environ.get("IS_PR") != "true":
            return None, False
        pr_number = os.environ.get("PR_NUMBER")
        body = os.environ.get("COMMENT_BODY", "").strip()
        return pr_number, bool(APPROVAL_COMMENT.match(body))

    return None, False


def handle_pr_approval() -> None:
    """Entry point: gates on the actor, then readies, approves, and auto-merges the PR."""
    actor = os.environ.get("GITHUB_ACTOR", "")
    repo_owner = os.environ.get("REPO_OWNER", "")
    repo = os.environ.get("GITHUB_REPOSITORY", "marius-patrik/omnis")

    allowed_users = {u for u in {repo_owner.lower(), "marius-patrik"} if u}
    if actor.lower() not in allowed_users:
        print(f"Actor {actor} not in allowed list {sorted(allowed_users)}. Skipping.")
        sys.exit(0)

    pr_number, is_approved = detect_approval()
    if not pr_number or not is_approved:
        print("Not an approval event. Skipping.")
        sys.exit(0)

    print(f"PR #{pr_number} approved by @{actor}. Preparing for auto-merge.")

    view = _gh(["pr", "view", str(pr_number), "--json", "isDraft,state,reviewDecision"], repo, True)
    data = json.loads(view.stdout)
    if data.get("state") != "OPEN":
        print(f"PR #{pr_number} is {data.get('state')}. Exiting.")
        sys.exit(0)

    if data.get("isDraft"):
        print(f"Marking PR #{pr_number} ready for review...")
        _gh(["pr", "ready", str(pr_number)], repo, True)

    if data.get("reviewDecision") == "REVIEW_REQUIRED":
        submit_proxy_review(int(pr_number), repo, actor)

    print(f"Enabling auto-merge for PR #{pr_number} with --delete-branch...")
    result = _gh(["pr", "merge", str(pr_number), "--auto", "--merge", "--delete-branch"], repo)
    print(f"Auto-merge result:\n{result.stdout}\n{result.stderr}")
    if result.returncode != 0:
        print("Attempting direct merge in case requirements are already satisfied...")
        direct = _gh(["pr", "merge", str(pr_number), "--merge", "--delete-branch"], repo)
        print(f"Direct merge result:\n{direct.stdout}\n{direct.stderr}")

    for _ in range(MERGE_POLL_ATTEMPTS):
        check = _gh(["pr", "view", str(pr_number), "--json", "state"], repo)
        if check.returncode == 0 and json.loads(check.stdout).get("state") == "MERGED":
            print(f"PR #{pr_number} merged successfully.")
            reconcile_post_merge(int(pr_number), repo)
            return
        time.sleep(MERGE_POLL_INTERVAL_SECONDS)

    print(
        f"PR #{pr_number} has not merged yet; auto-merge stays armed and the "
        f"post-merge reconciliation will run from the pull_request closed event."
    )


if __name__ == "__main__":
    handle_pr_approval()
