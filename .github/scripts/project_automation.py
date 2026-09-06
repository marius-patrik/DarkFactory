"""GitHub Project board automation.

Adds issues and pull requests to the Omnis project board and moves them between statuses in
response to lifecycle events (open, label, close, merge, push to main).

Unlike a hardcoded-ID implementation, the Status field id and its single-select option ids are
resolved from the GitHub API at runtime and cached for the process lifetime. Recreating the board,
renaming an option, or pointing the automation at a different project therefore requires no code
change. Environment variables may still pin the ids explicitly for offline or air-gapped runs.

Environment:
    PROJECT_OWNER: Project owner login (default: repository owner).
    PROJECT_NUMBER: Project number (default: 1).
    PROJECT_STATUS_FIELD_ID: Optional explicit Status field id, skipping discovery.
    GH_TOKEN: Token with `project`, `repo`, and `issues` scopes.
"""

import json
import os
import re
import subprocess
import sys
from typing import Any, Dict, List, Optional

PROJECT_OWNER = os.environ.get(
    "PROJECT_OWNER", os.environ.get("GITHUB_REPOSITORY_OWNER", "marius-patrik")
)

try:
    PROJECT_NUMBER = int(os.environ.get("PROJECT_NUMBER", "1"))
except (ValueError, TypeError):
    PROJECT_NUMBER = 1

DEFAULT_REPO = os.environ.get("GITHUB_REPOSITORY", "marius-patrik/omnis")

STATUS_FIELD_NAME = "Status"

#: Canonical status taxonomy (AGENTS.md rule 9). Order is significant: it is the board column order.
STATUS_NAMES: List[str] = [
    "Backlog",
    "ToDo",
    "In Progress",
    "Blocked",
    "Done",
    "Superseded",
    "Dropped",
]

#: Label-to-status precedence, highest priority first. A terminal status beats an active one so a
#: `Done` label always wins over a stale `In Progress` label left behind by an earlier transition.
STATUS_LABEL_PRECEDENCE: List[str] = [
    "Superseded",
    "Dropped",
    "Done",
    "Blocked",
    "In Progress",
    "Backlog",
    "ToDo",
]

#: Labels that describe a lifecycle status rather than a type or area. Managed exclusively by
#: automation; removed when the item moves on, so an item never carries two status labels.
STATUS_LABELS = set(STATUS_NAMES)

CLOSING_PATTERN = re.compile(
    r"(?i)\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+"
    r"(?:#(\d+)|https://github\.com/[^/\s]+/[^/\s]+/issues/(\d+))\b"
)


def extract_bound_issues(pr_body: Optional[str]) -> List[int]:
    """Extracts issue numbers bound to a pull request through closing keywords.

    Args:
        pr_body: Pull request description, possibly ``None``.

    Returns:
        Sorted list of unique bound issue numbers.
    """
    if not pr_body:
        return []
    issues = set()
    for short_ref, url_ref in CLOSING_PATTERN.findall(pr_body):
        num_str = short_ref or url_ref
        if num_str:
            issues.add(int(num_str))
    return sorted(issues)


def determine_status_from_labels(labels: List[str]) -> str:
    """Determines the board status implied by a set of labels.

    Args:
        labels: Label names attached to the issue or pull request.

    Returns:
        A status name from :data:`STATUS_NAMES`; ``"ToDo"`` when no status label is present.
    """
    normalized = {str(lbl).strip().lower() for lbl in labels}
    for status in STATUS_LABEL_PRECEDENCE:
        candidates = {status.lower()}
        if status == "ToDo":
            candidates.add("to do")
        if candidates & normalized:
            return status
    return "ToDo"


class GitHubProjectClient:
    """Thin wrapper over ``gh`` for project board mutations with runtime field discovery."""

    def __init__(self, owner: str = PROJECT_OWNER, project_number: int = PROJECT_NUMBER):
        """Initializes the client.

        Args:
            owner: Project owner login.
            project_number: Project number within the owner's scope.
        """
        self.owner = owner
        self.project_number = project_number
        self._project_id: Optional[str] = None
        self._status_field_id: Optional[str] = os.environ.get("PROJECT_STATUS_FIELD_ID") or None
        self._status_options: Optional[Dict[str, str]] = None

    def run_gh(self, args: List[str]) -> str:
        """Runs a ``gh`` command and returns stripped stdout.

        Args:
            args: Arguments following the ``gh`` executable.

        Returns:
            Command stdout with surrounding whitespace removed.

        Raises:
            subprocess.CalledProcessError: If the command exits non-zero.
        """
        result = subprocess.run(["gh"] + args, capture_output=True, text=True, check=True)
        return result.stdout.strip()

    @property
    def project_id(self) -> Optional[str]:
        """Node id of the project, resolved once and cached."""
        if self._project_id is None:
            try:
                output = self.run_gh(
                    [
                        "project",
                        "view",
                        str(self.project_number),
                        "--owner",
                        self.owner,
                        "--format",
                        "json",
                    ]
                )
                self._project_id = json.loads(output).get("id")
            except Exception as exc:  # noqa: BLE001 - board access is best-effort
                print(f"Could not resolve project id: {exc}", file=sys.stderr)
        return self._project_id

    def _load_status_field(self) -> None:
        """Discovers the Status field id and its option ids from the API."""
        if self._status_options is not None:
            return
        self._status_options = {}
        try:
            output = self.run_gh(
                [
                    "project",
                    "field-list",
                    str(self.project_number),
                    "--owner",
                    self.owner,
                    "--format",
                    "json",
                    "--limit",
                    "50",
                ]
            )
            for field in json.loads(output).get("fields", []):
                if field.get("name") != STATUS_FIELD_NAME:
                    continue
                self._status_field_id = self._status_field_id or field.get("id")
                for option in field.get("options", []):
                    self._status_options[option["name"]] = option["id"]
                break
        except Exception as exc:  # noqa: BLE001 - board access is best-effort
            print(f"Could not resolve Status field: {exc}", file=sys.stderr)

    @property
    def status_field_id(self) -> Optional[str]:
        """Field id of the single-select Status field."""
        self._load_status_field()
        return self._status_field_id

    def status_option_id(self, status_name: str) -> Optional[str]:
        """Returns the single-select option id for a status name.

        Args:
            status_name: One of :data:`STATUS_NAMES`.

        Returns:
            The option id, or ``None`` when the board has no such option.
        """
        self._load_status_field()
        assert self._status_options is not None
        return self._status_options.get(status_name)

    def add_item(self, url: str) -> Optional[str]:
        """Adds an issue or pull request to the project, returning its item id.

        Adding an item that is already present is idempotent on GitHub's side and returns the
        existing item id.

        Args:
            url: HTML url of the issue or pull request.

        Returns:
            Project item id, or ``None`` on failure.
        """
        try:
            output = self.run_gh(
                [
                    "project",
                    "item-add",
                    str(self.project_number),
                    "--owner",
                    self.owner,
                    "--url",
                    url,
                    "--format",
                    "json",
                ]
            )
            return json.loads(output).get("id")
        except Exception as exc:  # noqa: BLE001 - board access is best-effort
            print(f"Error adding item {url}: {exc}", file=sys.stderr)
            return None

    def edit_status(self, item_id: str, status_name: str) -> bool:
        """Sets the Status field of a project item.

        Args:
            item_id: Project item id.
            status_name: Target status name.

        Returns:
            ``True`` when the mutation succeeded.
        """
        option_id = self.status_option_id(status_name)
        project_id = self.project_id
        field_id = self.status_field_id
        if not option_id or not project_id or not field_id:
            print(
                f"Cannot set status {status_name!r}: "
                f"option={option_id} project={project_id} field={field_id}",
                file=sys.stderr,
            )
            return False
        try:
            self.run_gh(
                [
                    "project",
                    "item-edit",
                    "--id",
                    item_id,
                    "--project-id",
                    project_id,
                    "--field-id",
                    field_id,
                    "--single-select-option-id",
                    option_id,
                    "--format",
                    "json",
                ]
            )
            return True
        except Exception as exc:  # noqa: BLE001 - board access is best-effort
            print(f"Error updating item status: {exc}", file=sys.stderr)
            return False

    def set_status_label(self, repo: str, issue_number: int, status_name: str) -> None:
        """Applies a status label and removes every other status label.

        Keeping exactly one status label on an item is what prevents the stale-``In Progress``
        defect where a closed issue still advertises itself as active.

        Args:
            repo: Repository slug (``owner/name``).
            issue_number: Issue or pull request number.
            status_name: Status label to apply.
        """
        stale = sorted(STATUS_LABELS - {status_name})
        args = ["issue", "edit", str(issue_number), "--repo", repo, "--add-label", status_name]
        for label in stale:
            args += ["--remove-label", label]
        try:
            self.run_gh(args)
        except Exception as exc:  # noqa: BLE001 - label edits are best-effort
            print(f"Error setting status label on #{issue_number}: {exc}", file=sys.stderr)

    def add_issue_label(self, repo: str, issue_number: int, label: str) -> None:
        """Adds a single label to an issue or pull request.

        Args:
            repo: Repository slug (``owner/name``).
            issue_number: Issue or pull request number.
            label: Label to add.
        """
        if label in STATUS_LABELS:
            self.set_status_label(repo, issue_number, label)
            return
        try:
            self.run_gh(["issue", "edit", str(issue_number), "--repo", repo, "--add-label", label])
        except Exception as exc:  # noqa: BLE001 - label edits are best-effort
            print(f"Error adding label to issue #{issue_number}: {exc}", file=sys.stderr)

    def close_issue(self, repo: str, issue_number: int) -> None:
        """Closes an issue as completed, ignoring failures.

        Args:
            repo: Repository slug (``owner/name``).
            issue_number: Issue number.
        """
        try:
            self.run_gh(
                ["issue", "close", str(issue_number), "--repo", repo, "--reason", "completed"]
            )
        except Exception as exc:  # noqa: BLE001 - close is best-effort
            print(f"Notice: issue #{issue_number} close attempt: {exc}", file=sys.stderr)


def _labels_of(payload_entity: Dict[str, Any]) -> List[str]:
    """Extracts label names from an issue or pull request payload fragment.

    Args:
        payload_entity: Issue or pull request object from the webhook payload.

    Returns:
        List of label names.
    """
    return [
        lbl.get("name") if isinstance(lbl, dict) else str(lbl)
        for lbl in payload_entity.get("labels", [])
    ]


def _track(client: GitHubProjectClient, url: Optional[str], status: str) -> None:
    """Adds a url to the board and sets its status.

    Args:
        client: Project client.
        url: Issue or pull request html url.
        status: Target status name.
    """
    if not url:
        return
    item_id = client.add_item(url)
    if item_id and client.edit_status(item_id, status):
        print(f"{url} -> {status}")


def _handle_issue_event(payload: Dict[str, Any], client: GitHubProjectClient) -> None:
    """Processes an ``issues`` webhook event.

    Args:
        payload: Webhook payload.
        client: Project client.
    """
    action = payload.get("action")
    issue = payload.get("issue", {})
    issue_url = issue.get("html_url")
    issue_number = issue.get("number")
    repo = payload.get("repository", {}).get("full_name", DEFAULT_REPO)
    labels = _labels_of(issue)

    if not issue_url:
        return

    if action in ("opened", "reopened"):
        status = "ToDo" if action == "reopened" else determine_status_from_labels(labels)
        _track(client, issue_url, status)
    elif action in ("labeled", "unlabeled"):
        _track(client, issue_url, determine_status_from_labels(labels))
    elif action == "closed":
        status = determine_status_from_labels(labels)
        if status in ("ToDo", "In Progress", "Backlog"):
            status = "Done"
        _track(client, issue_url, status)
        if issue_number:
            client.set_status_label(repo, issue_number, status)


def _handle_pull_request_event(payload: Dict[str, Any], client: GitHubProjectClient) -> None:
    """Processes a ``pull_request`` webhook event.

    Args:
        payload: Webhook payload.
        client: Project client.
    """
    action = payload.get("action")
    pr = payload.get("pull_request", {})
    pr_url = pr.get("html_url")
    repo = payload.get("repository", {}).get("full_name", DEFAULT_REPO)
    merged = bool(pr.get("merged", False))
    labels = _labels_of(pr)
    bound_issues = extract_bound_issues(pr.get("body", ""))
    print(f"PR event {action}: bound issues {bound_issues}")

    if action in ("opened", "edited", "synchronize", "ready_for_review", "reopened"):
        status = determine_status_from_labels(labels)
        if status == "ToDo":
            status = "In Progress"
        _track(client, pr_url, status)
        for issue_num in bound_issues:
            client.set_status_label(repo, issue_num, "In Progress")
            _track(client, f"https://github.com/{repo}/issues/{issue_num}", "In Progress")

    elif action == "closed":
        pr_status = "Done" if merged else determine_status_from_labels(labels)
        if not merged and pr_status in ("ToDo", "In Progress"):
            pr_status = "Dropped"
        _track(client, pr_url, pr_status)

        if merged:
            for issue_num in bound_issues:
                client.set_status_label(repo, issue_num, "Done")
                _track(client, f"https://github.com/{repo}/issues/{issue_num}", "Done")
                client.close_issue(repo, issue_num)


def _handle_push_event(payload: Dict[str, Any], client: GitHubProjectClient) -> None:
    """Processes a ``push`` event on the default branch.

    Args:
        payload: Webhook payload.
        client: Project client.
    """
    if payload.get("ref") != "refs/heads/main":
        return
    repo = payload.get("repository", {}).get("full_name", DEFAULT_REPO)
    for commit in payload.get("commits", []):
        for issue_num in extract_bound_issues(commit.get("message", "")):
            client.set_status_label(repo, issue_num, "Done")
            _track(client, f"https://github.com/{repo}/issues/{issue_num}", "Done")
            client.close_issue(repo, issue_num)
    reconcile_unassigned_statuses(client)


def process_event(
    event_name: str, payload: Dict[str, Any], client: Optional[GitHubProjectClient] = None
) -> None:
    """Dispatches a webhook payload to the matching board handler.

    Args:
        event_name: GitHub event name.
        payload: Webhook payload.
        client: Optional injected client, used by tests.
    """
    if client is None:
        client = GitHubProjectClient()

    if event_name == "issues":
        _handle_issue_event(payload, client)
    elif event_name == "pull_request":
        _handle_pull_request_event(payload, client)
    elif event_name == "push":
        _handle_push_event(payload, client)
    elif event_name == "workflow_dispatch":
        reconcile_unassigned_statuses(client)


def reconcile_unassigned_statuses(client: GitHubProjectClient) -> None:
    """Gives every open board item without a status the one its labels imply.

    An item can reach the board without passing through a lifecycle event — added by hand, or added
    while the automation lacked a token that can write to Projects v2. Defaulting all of those to
    ``ToDo`` would silently promote backlog items into the ready queue, so the labels decide.

    Args:
        client: Project client.
    """
    try:
        raw_items = client.run_gh(
            [
                "project",
                "item-list",
                str(client.project_number),
                "--owner",
                client.owner,
                "--format",
                "json",
                "--limit",
                "500",
            ]
        )
        for item in json.loads(raw_items).get("items", []):
            content = item.get("content", {})
            if item.get("status") or not item.get("id") or content.get("closed", False):
                continue
            status = determine_status_from_labels(item.get("labels", []) or [])
            client.edit_status(item["id"], status)
            print(f"Self-healed item {item['id']} ({content.get('title')}) to {status}")
    except Exception as exc:  # noqa: BLE001 - reconciliation is best-effort
        print(f"Status reconciliation notice: {exc}", file=sys.stderr)


def main() -> None:
    """Entry point: reads the webhook payload from the environment and processes it."""
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    event_name = os.environ.get("GITHUB_EVENT_NAME", "")

    if not event_path or not os.path.exists(event_path):
        print(f"No GITHUB_EVENT_PATH found for event {event_name!r}")
        return

    with open(event_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    process_event(event_name, payload)


if __name__ == "__main__":
    main()
