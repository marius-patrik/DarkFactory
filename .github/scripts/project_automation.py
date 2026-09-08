"""GitHub Project board automation.

Adds issues and pull requests to every project board this repository is linked to, and moves them
between statuses in response to lifecycle events (open, label, close, merge, push to main).

Which boards those are comes from the repository manifest - `board.link_boards` names them and
`board.global_title` names the one aggregating every repository - not from a project number in the
environment. A number in the environment cannot express "this repository's own board and the global
one", and silently pointed every repository at project 1 when it was left unset.

Unlike a hardcoded-ID implementation, the Status field id and its single-select option ids are
resolved from the GitHub API at runtime and cached for the process lifetime. Recreating the board,
renaming an option, or pointing the automation at a different project therefore requires no code
change. Environment variables may still pin the ids explicitly for offline or air-gapped runs.

Environment:
    PROJECT_OWNER: Project owner login (default: repository owner).
    PROJECT_NUMBER: Fallback project number, used only when the manifest names no boards.
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


#: Board writes that failed during this run.
#:
#: Board access used to be best-effort throughout: every failure was caught, logged to stderr and
#: the run reported success. A pipeline that swallows its own failures cannot tell anyone it is
#: broken, and this one did not for days. Failures are still not raised where they occur - one
#: unreachable board must not stop the others being updated - but they are remembered, and `main`
#: exits non-zero if any occurred.
FAILURES: List[str] = []


def _fail(message: str) -> None:
    """Records a board failure and reports it.

    Args:
        message: What could not be done.
    """
    FAILURES.append(message)
    print(f"Error: {message}", file=sys.stderr)


def resolve_boards(owner: str = PROJECT_OWNER) -> List[int]:
    """Finds the project numbers of every board this repository is linked to.

    An item belongs on two boards: this repository's own, and the one aggregating every repository.
    That is deliberately *not* `linked_boards`, which is the wider set shown in the Projects tab -
    linking a board so it is visible from here must not start writing this repository's issues onto
    another repository's board.

    Boards are owned by the account rather than the repository, so they are named in the manifest
    and looked up by title. A title that resolves to nothing is a failure rather than a silent
    skip: the board exists in the declaration, so its absence is a fault worth reporting.

    Args:
        owner: Project owner login.

    Returns:
        Project numbers, in declaration order, without duplicates.
    """
    try:
        import manifest as manifest_module

        loaded = manifest_module.load(".")
        titles = [loaded.project_title]
        if loaded.global_board_title and loaded.global_board_title not in titles:
            titles.append(loaded.global_board_title)
    except Exception as exc:  # noqa: BLE001 - a missing manifest must not stop the run
        print(f"Could not read the board declaration: {exc}", file=sys.stderr)
        titles = []

    if not titles:
        print(f"No boards declared; falling back to project {PROJECT_NUMBER}.")
        return [PROJECT_NUMBER]

    try:
        output = subprocess.run(
            ["gh", "project", "list", "--owner", owner, "--limit", "100", "--format", "json"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout
        by_title = {p["title"]: p["number"] for p in json.loads(output).get("projects", [])}
    except Exception as exc:  # noqa: BLE001 - reported below, not raised here
        _fail(f"could not list projects for {owner}: {exc}")
        return []

    numbers: List[int] = []
    for title in titles:
        number = by_title.get(title)
        if number is None:
            _fail(f"no project board titled {title!r} for {owner}")
            continue
        if number not in numbers:
            numbers.append(number)
    return numbers


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

    def track(self, url: str, status: str) -> None:
        """Adds a url to this board and sets its status.

        Args:
            url: Issue or pull request html url.
            status: Target status name.
        """
        item_id = self.add_item(url)
        if item_id and self.edit_status(item_id, status):
            print(f"{url} -> {status} (project {self.project_number})")

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
        except Exception as exc:  # noqa: BLE001 - recorded, then reported by `main`
            _fail(f"adding {url} to project {self.project_number}: {exc}")
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


class BoardGroup:
    """Several boards addressed as one.

    Presents the same surface as a single client so every call site is unchanged. An item belongs
    on its repository's own board *and* on the board aggregating every repository, and those are
    different projects holding different item ids for the same issue.
    """

    def __init__(self, clients: List[GitHubProjectClient]) -> None:
        """Initializes the group.

        Args:
            clients: One client per board.
        """
        self.clients = clients

    def track(self, url: str, status: str) -> None:
        """Adds a url to every board and sets its status on each.

        Args:
            url: Issue or pull request html url.
            status: Target status name.
        """
        for client in self.clients:
            client.track(url, status)

    def set_status_label(self, repo: str, number: int, status: str) -> None:
        """Applies the status label once, since labels belong to the issue, not to a board.

        Args:
            repo: `owner/name` of the repository.
            number: Issue number.
            status: Target status name.
        """
        if self.clients:
            self.clients[0].set_status_label(repo, number, status)

    def close_issue(self, repo: str, number: int) -> None:
        """Closes an issue once, for the same reason.

        Args:
            repo: `owner/name` of the repository.
            number: Issue number.
        """
        if self.clients:
            self.clients[0].close_issue(repo, number)

    def open_items(self) -> List[Dict[str, Any]]:
        """Returns the open items of the first board, for reconciliation.

        Returns:
            Board items.
        """
        return self.clients[0].open_items() if self.clients else []


def _track(client: GitHubProjectClient, url: Optional[str], status: str) -> None:
    """Adds a url to the board and sets its status.

    Args:
        client: Project client.
        url: Issue or pull request html url.
        status: Target status name.
    """
    if not url:
        return
    client.track(url, status)


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
        numbers = resolve_boards()
        client = BoardGroup([GitHubProjectClient(project_number=n) for n in numbers])

    if event_name == "issues":
        _handle_issue_event(payload, client)
    elif event_name == "pull_request":
        _handle_pull_request_event(payload, client)
    elif event_name == "push":
        _handle_push_event(payload, client)
    elif event_name == "workflow_dispatch":
        reconcile_unassigned_statuses(client)


#: Statuses an item may legitimately hold once it is closed.
#:
#: A closed item is finished, abandoned or outranked. Any other status on a closed item is a
#: leftover from the moment before it closed, and says the board disagrees with the repository.
TERMINAL_STATUSES = frozenset({"Done", "Dropped", "Superseded"})


def settled_status(closed: bool, merged: bool, labels: List[str]) -> Optional[str]:
    """Decides the status an item should hold, or `None` to leave it alone.

    An open item's status is a matter of judgement and is left to the lifecycle events. A closed
    one is not: it is finished if it merged, and otherwise whatever its labels say, falling back to
    `Dropped` for something closed without implementation.

    Args:
        closed: Whether the item is closed.
        merged: Whether a pull request was merged.
        labels: The item's labels.

    Returns:
        The status it should hold, or `None` when nothing can be concluded.
    """
    if not closed:
        return None
    if merged:
        return "Done"
    labelled = determine_status_from_labels(labels)
    return labelled if labelled in TERMINAL_STATUSES else "Dropped"


def reconcile_unassigned_statuses(client: GitHubProjectClient) -> None:
    """Brings every board item's status back into agreement with the repository.

    Two things drift. An item can reach the board without passing through a lifecycle event - added
    by hand, or added while the automation lacked a token that can write to Projects v2 - and an
    item can be closed while the board still shows the status it held beforehand, because the event
    that would have moved it was lost, cancelled, or swallowed.

    The first case is filled from the labels: defaulting to `ToDo` would silently promote backlog
    items into the ready queue. The second is corrected outright, because a closed item showing
    `In Progress` is the board contradicting the repository rather than expressing a judgement.

    Open items are never overridden. Their status is exactly the judgement the board exists to
    record.

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
            item_id = item.get("id")
            if not item_id:
                continue
            current = item.get("status")
            labels = item.get("labels", []) or []
            closed = bool(content.get("closed", False))
            merged = str(content.get("state", "")).upper() == "MERGED"

            if not closed:
                if current:
                    continue
                wanted = determine_status_from_labels(labels)
            else:
                wanted = settled_status(closed, merged, labels)
                if wanted is None or wanted == current:
                    continue

            client.edit_status(item_id, wanted)
            was = current or "no status"
            print(f"Reconciled item {item_id} ({content.get('title')}): {was} -> {wanted}")
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

    if FAILURES:
        print(f"\n{len(FAILURES)} board operation(s) failed:", file=sys.stderr)
        for failure in FAILURES:
            print(f"  - {failure}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
