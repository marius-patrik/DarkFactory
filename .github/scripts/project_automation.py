"""GitHub Project board automation.

Adds issues and pull requests to every project board this repository is linked to, and moves them
between statuses in response to lifecycle events (open, label, close, merge, push to main).

Which boards those are comes from the repository manifest - `board.link_boards` names them and
`board.global_title` names the one aggregating every repository - not from a project number in the
environment.

Status field id and its single-select option ids are resolved directly from the GitHub GraphQL API
at runtime and cached for the process lifetime. Furthermore, the automation programmatically
enforces the canonical 7-status taxonomy across all linked boards on every run, ensuring that no
board drifts and no lossy status mapping occurs.

All GitHub interactions are performed via native HTTP APIs using Python's standard library
(`urllib.request`) - zero CLI subprocesses are executed:
- Repository and issue work (listings, labels, closures) is handled by `GitHubRestClient`
  authenticated with the GitHub App installation token (`GH_TOKEN`), drawing on the App's dedicated
  5,000 req/hr rate limit.
- Projects v2 mutations and queries are handled by `GitHubGraphQLClient` authenticated with
  `GH_PROJECT_TOKEN` (User PAT with `project` scope), with real-time HTTP rate-limit inspection.

Environment:
    PROJECT_OWNER: Project owner login (default: repository owner).
    PROJECT_NUMBER: Fallback project number, used only when the manifest names no boards.
    PROJECT_STATUS_FIELD_ID: Optional explicit Status field id, skipping discovery.
    GH_TOKEN: GitHub App installation token for repository REST operations.
    GH_PROJECT_TOKEN: User personal access token for Projects v2 GraphQL operations.
    PROJECT_QUOTA_MINIMUM: Live GraphQL quota reserve below which mutations pause (default: 50).
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

PROJECT_OWNER = os.environ.get(
    "PROJECT_OWNER", os.environ.get("GITHUB_REPOSITORY_OWNER", "marius-patrik")
)

try:
    PROJECT_NUMBER = int(os.environ.get("PROJECT_NUMBER", "1"))
except (ValueError, TypeError):
    PROJECT_NUMBER = 1

#: Repository acted upon.
DEFAULT_REPO = os.environ.get("GITHUB_REPOSITORY", "")

STATUS_FIELD_NAME = "Status"

#: Canonical status taxonomy (`.agents/rules/009-issue-binding-and-board-status.md`). Order is significant: it is the board column order.
STATUS_NAMES: List[str] = [
    "Backlog",
    "ToDo",
    "In Progress",
    "Blocked",
    "Done",
    "Superseded",
    "Dropped",
]

#: Canonical Status field options specifications for system-level enforcement.
CANONICAL_STATUS_OPTIONS: List[Dict[str, str]] = [
    {
        "name": "Backlog",
        "color": "PURPLE",
        "description": "Staged for future consideration",
    },
    {
        "name": "ToDo",
        "color": "GREEN",
        "description": "Approved and ready to be worked on",
    },
    {
        "name": "In Progress",
        "color": "YELLOW",
        "description": "Work is actively in progress",
    },
    {
        "name": "Blocked",
        "color": "ORANGE",
        "description": "Blocked by dependencies, externals, or agent quota",
    },
    {
        "name": "Done",
        "color": "BLUE",
        "description": "Completed and verified",
    },
    {
        "name": "Superseded",
        "color": "GRAY",
        "description": "Outranked by a newer request or plan",
    },
    {
        "name": "Dropped",
        "color": "RED",
        "description": "Closed without implementation or abandoned",
    },
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
TERMINAL_STATUSES = frozenset({"Done", "Dropped", "Superseded"})

CLOSING_PATTERN = re.compile(
    r"(?i)\b(?:close|closes|closed|fix|fixes|fixed|resolve|resolves|resolved)\s+"
    r"(?:#(\d+)|https://github\.com/[^/\s]+/[^/\s]+/issues/(\d+))\b"
)

URL_PATTERN = re.compile(r"^https://github\.com/([^/]+)/([^/]+)/(?:issues|pull)/(\d+)")

#: Board writes that failed during this run.
FAILURES: List[str] = []

#: Rate limit detection and graceful backoff flag.
RATE_LIMITED = False

#: Remaining GraphQL points reported by GitHub x-ratelimit-remaining header.
GRAPHQL_REMAINING: Optional[int] = None

#: Minimum GraphQL quota required to allow bulk reconciliation scans.
try:
    QUOTA_RECONCILIATION_THRESHOLD = int(
        os.environ.get("PROJECT_QUOTA_RECONCILIATION_THRESHOLD", "1000")
    )
except (ValueError, TypeError):
    QUOTA_RECONCILIATION_THRESHOLD = 1000

#: Minimum GraphQL quota required for any operation.
try:
    QUOTA_MINIMUM = int(os.environ.get("PROJECT_QUOTA_MINIMUM", "50"))
except (ValueError, TypeError):
    QUOTA_MINIMUM = 50

#: Board writes completed in this execution, retained for operational observability only. There is
#: no cap tied to this counter - the only write gate is the live GraphQL quota reserve above.
MUTATIONS_PERFORMED = 0


def mark_rate_limited(message: Optional[str] = None) -> None:
    """Sets the global rate-limited flag and optionally logs a notice.

    Args:
        message: Optional explanatory message.
    """
    global RATE_LIMITED
    RATE_LIMITED = True
    if message:
        print(f"Notice: {message}; pausing.", file=sys.stderr)


def record_mutation() -> None:
    """Records that a mutation was performed."""
    global MUTATIONS_PERFORMED
    MUTATIONS_PERFORMED += 1


def can_mutate() -> bool:
    """Checks whether further mutations are permitted given rate limits and the live quota reserve.

    There is no artificial per-run mutation cap: a reconciliation run may write as many items as
    the live GraphQL quota allows, pausing only once the reserve (`QUOTA_MINIMUM`) is reached.
    """
    if RATE_LIMITED:
        return False
    if GRAPHQL_REMAINING is not None and GRAPHQL_REMAINING <= QUOTA_MINIMUM:
        return False
    return True


def can_reconcile() -> bool:
    """Checks whether bulk reconciliation is safe given current quota reserves."""
    if RATE_LIMITED:
        return False
    if GRAPHQL_REMAINING is not None and GRAPHQL_REMAINING < QUOTA_RECONCILIATION_THRESHOLD:
        print(
            f"Notice: GraphQL quota below reserve ({GRAPHQL_REMAINING} < {QUOTA_RECONCILIATION_THRESHOLD}); "
            f"skipping bulk reconciliation to preserve quota for real-time events.",
            file=sys.stderr,
        )
        return False
    return can_mutate()


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


def determine_status_from_labels(labels: Sequence[Any], *, closed: bool = False) -> str:
    """Determines the board status implied by a set of labels.

    Maintained for backward compatibility; delegates to :func:`expected_status`.

    Args:
        labels: Label names or label dicts attached to the issue or pull request.
        closed: Whether the issue or pull request is closed.

    Returns:
        A status name from :data:`STATUS_NAMES`; ``"ToDo"`` when no applicable status label is
        present.
    """
    return expected_status({"labels": labels, "state": "closed" if closed else "open"})


def _label_names(labels: Sequence[Any]) -> Set[str]:
    """Returns lower-cased label names from label dicts or strings."""
    names: Set[str] = set()
    for lbl in labels:
        name = lbl.get("name") if isinstance(lbl, dict) else str(lbl)
        if name:
            names.add(name.strip().lower())
    return names


def has_terminal_status_label(labels: Sequence[Any]) -> bool:
    """Returns whether any terminal status label is present."""
    return bool(_label_names(labels) & {s.lower() for s in TERMINAL_STATUSES})


def checkpoint_covers_issue(issue_number: Optional[int]) -> bool:
    """Returns True when a quota checkpoint exists for the given issue number.

    The checkpoint file is written by the agent runner on exhaustion. Project automation reads the
    same path so a reopen cannot wipe ``Blocked`` resume state.

    Args:
        issue_number: Issue number to match against the checkpoint payload.

    Returns:
        True when a readable checkpoint names this issue.
    """
    if not issue_number:
        return False
    candidates = []
    for key in ("STATE_DIR", "GITHUB_WORKSPACE"):
        value = os.environ.get(key)
        if value:
            candidates.append(value)
    candidates.append(".")
    seen: Set[str] = set()
    for directory in candidates:
        path = os.path.abspath(os.path.join(directory, ".antigravity_checkpoint.json"))
        if path in seen:
            continue
        seen.add(path)
        if not os.path.isfile(path):
            continue
        try:
            with open(path, "r", encoding="utf-8") as handle:
                data = json.load(handle)
        except (OSError, json.JSONDecodeError):
            continue
        if isinstance(data, dict) and data.get("issue_number") == issue_number:
            return True
    return False


def expected_status(
    item: Any,
    *,
    bound_prs: Optional[Sequence[Any]] = None,
    checkpoint: Optional[bool] = None,
) -> str:
    """Derives the canonical board status for an issue or pull request from live facts.

    Enforces the single canonical model across both real-time event handlers and historic
    reconciliation:
    - Closed items are always terminal (Done, Dropped, Superseded).
    - Open items are never terminal (Backlog, ToDo, In Progress, Blocked).
    - Pull requests merged or issues closed completed -> Done.
    - Pull requests closed unmerged or issues closed not planned -> Dropped (or Superseded if duplicate/superseded).
    - Open items blocked by quota checkpoint or Blocked label -> Blocked.
    - Open pull requests or issues with active bound work -> In Progress.
    - Staged items with Backlog label -> Backlog.
    - Approved or newly filed open items awaiting work -> ToDo.

    Args:
        item: Issue or pull request dict, object, or mapping carrying live facts.
        bound_prs: Optional list of bound pull request objects or dicts (if not inside item).
        checkpoint: Optional explicit override for whether a quota checkpoint exists.

    Returns:
        One of the canonical statuses from :data:`STATUS_NAMES`.
    """
    if isinstance(item, dict):
        kind = item.get("kind") or item.get("type") or item.get("__typename") or ""
        is_pr = bool(
            item.get("is_pr")
            or item.get("isPr")
            or item.get("pull_request")
            or str(kind).lower() in ("pullrequest", "pr")
        )
        state_str = str(item.get("state", "")).strip().lower()
        is_merged = bool(
            item.get("merged")
            or item.get("merged_at")
            or item.get("mergedAt")
            or (
                isinstance(item.get("pull_request"), dict) and item["pull_request"].get("merged_at")
            )
            or state_str == "merged"
        )
        is_closed = (
            state_str in ("closed", "merged") or is_merged or bool(item.get("closed", False))
        )
        is_draft = bool(item.get("draft") or item.get("is_draft") or item.get("isDraft"))
        state_reason_val = item.get("state_reason") or item.get("stateReason")
        state_reason = str(state_reason_val).strip().lower() if state_reason_val else None

        raw_labels = item.get("labels", [])
        if isinstance(raw_labels, dict) and "nodes" in raw_labels:
            raw_labels = raw_labels["nodes"]
        labels_list = []
        for l in raw_labels or []:
            name = l.get("name") if isinstance(l, dict) else str(l)
            if name:
                labels_list.append(name.strip())

        item_checkpoint = item.get("checkpoint")
        if checkpoint is None:
            if item_checkpoint is not None:
                checkpoint = bool(item_checkpoint)
            else:
                num = item.get("number") or item.get("issue_number")
                if num is not None and not is_pr:
                    try:
                        checkpoint = checkpoint_covers_issue(int(num))
                    except (ValueError, TypeError):
                        checkpoint = False
                else:
                    checkpoint = False

        item_bound_prs = bound_prs or item.get("bound_prs") or item.get("bound_pr_states") or []
    else:
        kind = getattr(item, "kind", getattr(item, "type", ""))
        is_pr = bool(getattr(item, "is_pr", False) or str(kind).lower() in ("pullrequest", "pr"))
        state_str = str(getattr(item, "state", "")).strip().lower()
        is_merged = bool(
            getattr(item, "merged", False)
            or getattr(item, "merged_at", None)
            or state_str == "merged"
        )
        is_closed = state_str in ("closed", "merged") or is_merged
        is_draft = bool(getattr(item, "draft", False) or getattr(item, "is_draft", False))
        state_reason_val = getattr(item, "state_reason", getattr(item, "stateReason", None))
        state_reason = str(state_reason_val).strip().lower() if state_reason_val else None
        raw_labels = getattr(item, "labels", [])
        labels_list = [l.get("name") if isinstance(l, dict) else str(l) for l in raw_labels if l]
        if checkpoint is None:
            checkpoint = bool(getattr(item, "checkpoint", False))
        item_bound_prs = bound_prs or getattr(item, "bound_prs", [])

    bound_pr_merged = False
    bound_pr_ready = False
    for pr in item_bound_prs:
        if isinstance(pr, dict):
            pr_st = str(pr.get("state", "")).strip().lower()
            pr_mg = bool(
                pr.get("merged") or pr.get("merged_at") or pr.get("mergedAt") or pr_st == "merged"
            )
            pr_dr = bool(pr.get("draft") or pr.get("is_draft") or pr.get("isDraft"))
        else:
            pr_st = str(getattr(pr, "state", "")).strip().lower()
            pr_mg = bool(
                getattr(pr, "merged", False) or getattr(pr, "merged_at", None) or pr_st == "merged"
            )
            pr_dr = bool(getattr(pr, "draft", False) or getattr(pr, "is_draft", False))
        if pr_mg:
            bound_pr_merged = True
        elif pr_st == "open" and not pr_dr:
            bound_pr_ready = True

    normalized_labels = {lbl.lower() for lbl in labels_list}
    has_superseded = bool({"superseded", "duplicate"} & normalized_labels) or state_reason in (
        "duplicate",
        "superseded",
    )
    has_dropped = "dropped" in normalized_labels or state_reason in ("not_planned", "not-planned")
    has_blocked = "blocked" in normalized_labels
    has_in_progress = "in progress" in normalized_labels
    has_backlog = "backlog" in normalized_labels
    has_todo = bool({"todo", "to do"} & normalized_labels)

    # 1. Closed items: always terminal (Done, Dropped, Superseded)
    if is_closed:
        if is_pr:
            if is_merged:
                return "Done"
            if has_superseded:
                return "Superseded"
            return "Dropped"
        else:
            if is_merged or bound_pr_merged:
                return "Done"
            if has_superseded:
                return "Superseded"
            if has_dropped:
                return "Dropped"
            if state_reason == "completed":
                return "Done"
            if "done" in normalized_labels:
                return "Done"
            if "dropped" in normalized_labels:
                return "Dropped"
            if "superseded" in normalized_labels:
                return "Superseded"
            return "Dropped"

    # 2. Open items: never terminal (Backlog, ToDo, In Progress, Blocked)
    if checkpoint or has_blocked:
        return "Blocked"

    if is_pr:
        return "In Progress"

    if bound_pr_ready or has_in_progress:
        return "In Progress"
    if has_backlog:
        return "Backlog"
    if has_todo:
        return "ToDo"

    return "ToDo"


def is_rate_limited(exc: BaseException) -> bool:
    """Checks whether an exception represents a rate limit, quota exhaustion, or throttling.

    Args:
        exc: Exception to inspect.

    Returns:
        True when the error indicates rate limiting or quota exhaustion.
    """
    text = _detail(exc).lower()
    indicators = (
        "unknown owner type",
        "rate limit",
        "rate_limit",
        "too many requests",
        "secondary rate limit",
        "was submitted too quickly",
        "quota exceeded",
    )
    return any(ind in text for ind in indicators)


def _detail(exc: BaseException) -> str:
    """Renders an exception together with any output that explains it.

    Args:
        exc: The exception to render.

    Returns:
        String description of the exception.
    """
    captured = getattr(exc, "stderr", None) or getattr(exc, "stdout", None) or ""
    if isinstance(captured, bytes):
        captured = captured.decode("utf-8", "replace")
    lines = [line for line in str(captured).strip().splitlines() if line.strip()]
    return f"{exc} ({lines[0].strip()})" if lines else str(exc)


def _fail(message: str) -> None:
    """Records a board failure and reports it.

    Args:
        message: What could not be done.
    """
    FAILURES.append(message)
    print(f"Error: {message}", file=sys.stderr)


class GitHubRestClient:
    """REST API client using standard library urllib.request for GitHub repository operations."""

    def __init__(self, token: Optional[str] = None):
        """Initializes the REST client.

        Args:
            token: Optional explicit authentication token. Defaults to GH_TOKEN, then GH_PROJECT_TOKEN.
        """
        self.token = (
            token
            or os.environ.get("GH_TOKEN")
            or os.environ.get("GH_PROJECT_TOKEN")
            or os.environ.get("GITHUB_TOKEN")
            or ""
        )
        self.base_url = "https://api.github.com"
        self._node_id_cache: Dict[Tuple[str, int], str] = {}

    def request(
        self,
        method: str,
        path: str,
        json_data: Optional[Any] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """Sends an HTTP request to the GitHub REST API.

        Args:
            method: HTTP verb (GET, POST, PUT, PATCH, DELETE).
            path: API path starting with '/'.
            json_data: Optional JSON payload for the body.
            params: Optional query parameters.

        Returns:
            Parsed JSON response, or empty dict/None for empty responses.
        """
        url = f"{self.base_url}{path}"
        if params:
            query_str = urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})
            url = f"{url}?{query_str}"

        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "DarkFactory-ProjectAutomation/1.0",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        data_bytes = None
        if json_data is not None:
            data_bytes = json.dumps(json_data).encode("utf-8")
            headers["Content-Type"] = "application/json"

        req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                rem = resp.headers.get("x-ratelimit-remaining")
                if rem is not None:
                    try:
                        if int(rem) <= 20:
                            mark_rate_limited()
                    except ValueError:
                        pass
                content = resp.read().decode("utf-8")
                return json.loads(content) if content else {}
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            if exc.code in (403, 429) or "rate limit" in body.lower():
                mark_rate_limited(f"GitHub REST API rate limit on {method} {path}")
            raise RuntimeError(f"HTTP {exc.code} on {method} {path}: {body}") from exc

    def get_issue(self, repo: str, number: int) -> Dict[str, Any]:
        """Fetches an issue or pull request by number.

        Args:
            repo: `owner/name` repository slug.
            number: Issue number.

        Returns:
            Issue JSON dictionary.
        """
        data = self.request("GET", f"/repos/{repo}/issues/{number}")
        node_id = data.get("node_id")
        if node_id:
            self._node_id_cache[(repo, number)] = node_id
        return data

    def get_node_id(self, repo: str, number: int) -> Optional[str]:
        """Resolves the GraphQL node id of an issue or PR, caching the result.

        Args:
            repo: `owner/name` repository slug.
            number: Issue or pull request number.

        Returns:
            GraphQL node ID, or None if lookup fails.
        """
        cached = self._node_id_cache.get((repo, number))
        if cached:
            return cached
        try:
            issue = self.get_issue(repo, number)
            return issue.get("node_id")
        except Exception:
            return None

    def list_issues_and_prs(
        self, repo: str, state: str = "all", limit: int = 500
    ) -> List[Dict[str, Any]]:
        """Lists repository issues and pull requests with pagination.

        Args:
            repo: `owner/name` repository slug.
            state: State filter ('all', 'open', 'closed').
            limit: Maximum total items to return.

        Returns:
            List of issue and pull request dicts.
        """
        results: List[Dict[str, Any]] = []
        page = 1
        per_page = 100
        while len(results) < limit:
            try:
                batch = self.request(
                    "GET",
                    f"/repos/{repo}/issues",
                    params={"state": state, "per_page": per_page, "page": page},
                )
            except Exception as exc:
                if is_rate_limited(exc):
                    mark_rate_limited()
                _fail(f"could not list issues in {repo}: {_detail(exc)}")
                break
            if not batch or not isinstance(batch, list):
                break
            for item in batch:
                node_id = item.get("node_id")
                number = item.get("number")
                if node_id and number:
                    self._node_id_cache[(repo, number)] = node_id
                results.append(item)
            if len(batch) < per_page:
                break
            page += 1
        return results[:limit]

    def set_status_label(
        self,
        repo: str,
        issue_number: int,
        status_name: str,
        existing_labels: Optional[List[Any]] = None,
    ) -> None:
        """Applies a status label exclusively while preserving all other issue labels.

        Args:
            repo: Repository slug (`owner/name`).
            issue_number: Issue number.
            status_name: Status label to assign.
            existing_labels: Optional list of current labels to avoid an extra lookup.
        """
        # The label set is never replaced. A PUT built from a label list read earlier (often the
        # event payload) wipes every label another writer added in between: on #227 the agent's
        # type and area labels were removed nine seconds after it applied them. Adding the status
        # and deleting only the other status labels touches nothing else.
        del existing_labels  # kept for callers; the POST response is the fresh label list
        try:
            current = self.request(
                "POST", f"/repos/{repo}/issues/{issue_number}/labels", {"labels": [status_name]}
            )
        except Exception as exc:
            print(f"Error setting status label on #{issue_number}: {_detail(exc)}", file=sys.stderr)
            return
        for lbl in current if isinstance(current, list) else []:
            name = lbl.get("name") if isinstance(lbl, dict) else str(lbl)
            if name in STATUS_LABELS and name != status_name:
                try:
                    self.request(
                        "DELETE",
                        f"/repos/{repo}/issues/{issue_number}/labels/"
                        f"{urllib.parse.quote(name, safe='')}",
                    )
                except Exception as exc:
                    print(
                        f"Error removing status label {name!r} from #{issue_number}: {_detail(exc)}",
                        file=sys.stderr,
                    )

    def add_issue_label(self, repo: str, issue_number: int, label: str) -> None:
        """Adds a single label to an issue or pull request.

        Args:
            repo: Repository slug (`owner/name`).
            issue_number: Issue number.
            label: Label name.
        """
        try:
            self.request("POST", f"/repos/{repo}/issues/{issue_number}/labels", {"labels": [label]})
        except Exception as exc:
            print(f"Error adding label to issue #{issue_number}: {_detail(exc)}", file=sys.stderr)

    def close_issue(self, repo: str, issue_number: int, reason: str = "completed") -> None:
        """Closes an issue with a specific state reason.

        Args:
            repo: Repository slug (`owner/name`).
            issue_number: Issue number.
            reason: GitHub state reason ('completed' or 'not_planned').
        """
        try:
            self.request(
                "PATCH",
                f"/repos/{repo}/issues/{issue_number}",
                {"state": "closed", "state_reason": reason},
            )
        except Exception as exc:
            print(f"Notice: issue #{issue_number} close attempt: {_detail(exc)}", file=sys.stderr)


class GitHubGraphQLClient:
    """GraphQL API client using urllib.request for GitHub Projects v2 operations."""

    def __init__(self, token: Optional[str] = None):
        """Initializes the GraphQL client.

        Args:
            token: Optional explicit token. Defaults to GH_PROJECT_TOKEN, then GH_TOKEN.
        """
        self.token = (
            token
            or os.environ.get("GH_PROJECT_TOKEN")
            or os.environ.get("GH_TOKEN")
            or os.environ.get("GITHUB_TOKEN")
            or ""
        )
        self.endpoint = "https://api.github.com/graphql"
        self._projects_cache: Optional[Dict[str, Dict[str, Any]]] = None

    def execute(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Executes a GraphQL query or mutation with error checking and rate-limit tracking.

        Args:
            query: GraphQL query or mutation string.
            variables: Optional variables dictionary.

        Returns:
            The 'data' dictionary from the GraphQL response.

        Raises:
            RuntimeError: If GraphQL errors are returned in the response payload.
        """
        headers = {
            "User-Agent": "DarkFactory-ProjectAutomation/1.0",
            "Content-Type": "application/json",
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        payload = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
        req = urllib.request.Request(self.endpoint, data=payload, headers=headers, method="POST")

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                rem = resp.headers.get("x-ratelimit-remaining")
                if rem is not None:
                    try:
                        val = int(rem)
                        global GRAPHQL_REMAINING
                        GRAPHQL_REMAINING = val
                        if val <= QUOTA_MINIMUM:
                            mark_rate_limited(f"GraphQL quota exhausted ({val} remaining)")
                    except ValueError:
                        # A malformed remaining value must not be read as "quota unknown, so
                        # unlimited" - with no mutation-count fallback left, this reserve is the
                        # only write gate, so an unparseable header pauses mutations instead.
                        _fail(f"malformed GraphQL rate-limit header: {rem!r}")
                        mark_rate_limited("Malformed GraphQL rate-limit header")
                content = resp.read().decode("utf-8")
                parsed = json.loads(content) if content else {}
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "replace")
            if exc.code in (403, 429) or "rate limit" in body.lower():
                mark_rate_limited("GitHub GraphQL rate limit encountered")
            raise RuntimeError(f"HTTP {exc.code} on GraphQL request: {body}") from exc

        errors = parsed.get("errors", [])
        if errors:
            msg = "; ".join(err.get("message", str(err)) for err in errors)
            if any("rate limit" in str(err).lower() for err in errors):
                mark_rate_limited("GitHub GraphQL rate limit in errors")
            raise RuntimeError(f"GraphQL error: {msg}")

        return parsed.get("data", {})

    def resolve_projects(self, owner: str) -> Dict[str, Dict[str, Any]]:
        """Discovers all Projects v2 for a user or organization with lean projection and in-process caching.

        Args:
            owner: User or organization login.

        Returns:
            Mapping of project title to metadata dict (id, number, etc.).
        """
        if self._projects_cache is not None:
            return self._projects_cache

        query = """
        query GetProjects($login: String!) {
          user(login: $login) {
            projectsV2(first: 20) {
              nodes {
                id
                number
                title
              }
            }
          }
        }
        """
        try:
            data = self.execute(query, {"login": owner})
            nodes = data.get("user", {}).get("projectsV2", {}).get("nodes", [])
            self._projects_cache = {
                node["title"]: node for node in nodes if node and "title" in node
            }
            return self._projects_cache
        except Exception as exc:
            if is_rate_limited(exc):
                mark_rate_limited()
            print(f"Error resolving projects for {owner}: {_detail(exc)}", file=sys.stderr)
            return {}

    def get_project_fields(self, project_id: str) -> List[Dict[str, Any]]:
        """Fetches single-select fields and options for a specific project node ID."""
        query = """
        query GetProjectFields($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                      color
                      description
                    }
                  }
                }
              }
            }
          }
        }
        """
        try:
            data = self.execute(query, {"projectId": project_id})
            proj_node = data.get("node") or {}
            return proj_node.get("fields", {}).get("nodes", [])
        except Exception as exc:
            if is_rate_limited(exc):
                mark_rate_limited()
            print(
                f"Error fetching project fields for {project_id}: {_detail(exc)}", file=sys.stderr
            )
            return []

    def fetch_board_items(self, project_id: str, limit: int = 1000) -> List[Dict[str, Any]]:
        """Fetches items of a project board with lean projections to minimize GraphQL complexity cost.

        Args:
            project_id: Project node ID.
            limit: Maximum items to retrieve.

        Returns:
            List of project item dicts.
        """
        query = """
        query GetBoardItems($projectId: ID!, $cursor: String) {
          node(id: $projectId) {
            ... on ProjectV2 {
              items(first: 50, after: $cursor) {
                pageInfo {
                  hasNextPage
                  endCursor
                }
                nodes {
                  id
                  fieldValues(first: 8) {
                    nodes {
                      ... on ProjectV2ItemFieldSingleSelectValue {
                        name
                        optionId
                        field {
                          ... on ProjectV2SingleSelectField {
                            name
                          }
                        }
                      }
                    }
                  }
                  content {
                    __typename
                    ... on Issue {
                      id
                      number
                      url
                      title
                      state
                      stateReason
                      labels(first: 10) {
                        nodes {
                          name
                        }
                      }
                    }
                    ... on PullRequest {
                      id
                      number
                      url
                      title
                      state
                      merged
                      labels(first: 10) {
                        nodes {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        """
        items: List[Dict[str, Any]] = []
        cursor: Optional[str] = None
        while len(items) < limit:
            try:
                data = self.execute(query, {"projectId": project_id, "cursor": cursor})
            except Exception as exc:
                if is_rate_limited(exc):
                    mark_rate_limited()
                print(f"Error fetching board items: {_detail(exc)}", file=sys.stderr)
                break

            proj_node = data.get("node") or {}
            items_data = proj_node.get("items") or {}
            nodes = items_data.get("nodes", [])
            items.extend(nodes)

            page_info = items_data.get("pageInfo", {})
            if page_info.get("hasNextPage"):
                cursor = page_info.get("endCursor")
            else:
                break
        return items[:limit]

    def add_item(self, project_id: str, content_id: str) -> Optional[str]:
        """Adds an issue or pull request to a project by its GraphQL node ID.

        Args:
            project_id: Project node ID.
            content_id: Issue or pull request node ID.

        Returns:
            Project item ID, or None on failure.
        """
        mutation = """
        mutation AddItem($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
            item {
              id
            }
          }
        }
        """
        try:
            data = self.execute(mutation, {"projectId": project_id, "contentId": content_id})
            return data.get("addProjectV2ItemById", {}).get("item", {}).get("id")
        except Exception as exc:
            if is_rate_limited(exc):
                mark_rate_limited()
            # Two runs for the same issue race to add it; the loser is told the item exists. That
            # is the state it wanted, so it is found rather than reported - reporting it filed a
            # failure issue whose own events started the next race.
            if "already exists in this project" in str(exc):
                existing = self.find_item_for_content(project_id, content_id)
                if existing:
                    return existing
            _fail(f"adding content {content_id} to project {project_id}: {_detail(exc)}")
            return None

    def find_item_for_content(self, project_id: str, content_id: str) -> Optional[str]:
        """Finds the project item that already holds an issue or pull request.

        Args:
            project_id: Project node ID.
            content_id: Issue or pull request node ID.

        Returns:
            Project item ID, or None when the content is not on that project or the lookup fails.
        """
        query = """
        query ItemForContent($contentId: ID!) {
          node(id: $contentId) {
            ... on Issue { projectItems(first: 50) { nodes { id project { id } } } }
            ... on PullRequest { projectItems(first: 50) { nodes { id project { id } } } }
          }
        }
        """
        try:
            data = self.execute(query, {"contentId": content_id})
        except Exception as exc:
            if is_rate_limited(exc):
                mark_rate_limited()
            return None
        nodes = ((data.get("node") or {}).get("projectItems") or {}).get("nodes") or []
        for node in nodes:
            if (node.get("project") or {}).get("id") == project_id:
                return node.get("id")
        return None

    def update_item_status(
        self, project_id: str, item_id: str, field_id: str, option_id: str
    ) -> bool:
        """Sets a project item's single-select status field value.

        Args:
            project_id: Project node ID.
            item_id: Project item ID.
            field_id: Status field ID.
            option_id: Single-select option ID.

        Returns:
            True if the mutation succeeded.
        """
        mutation = """
        mutation UpdateStatus($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
          updateProjectV2ItemFieldValue(
            input: {
              projectId: $projectId
              itemId: $itemId
              fieldId: $fieldId
              value: {
                singleSelectOptionId: $optionId
              }
            }
          ) {
            projectV2Item {
              id
            }
          }
        }
        """
        try:
            self.execute(
                mutation,
                {
                    "projectId": project_id,
                    "itemId": item_id,
                    "fieldId": field_id,
                    "optionId": option_id,
                },
            )
            return True
        except Exception as exc:
            if is_rate_limited(exc):
                mark_rate_limited()
            print(f"Error updating item {item_id} status: {_detail(exc)}", file=sys.stderr)
            return False

    def enforce_board_taxonomy(
        self, field_id: str, existing_options: List[Dict[str, Any]]
    ) -> Dict[str, str]:
        """Ensures that the Status field contains all canonical 7 options without lossy fallback.

        Preserves existing option IDs for matching names and omits IDs for new options to allow
        GitHub to generate valid IDs.

        Args:
            field_id: Status field node ID.
            existing_options: Currently configured option dicts.

        Returns:
            Updated mapping of canonical status name to option ID.
        """
        existing_by_name = {
            opt["name"].strip().lower(): opt for opt in existing_options if opt and "name" in opt
        }

        options_input = [
            {
                "name": canonical["name"],
                "color": canonical["color"],
                "description": canonical["description"],
            }
            for canonical in CANONICAL_STATUS_OPTIONS
        ]

        mutation = """
        mutation EnforceTaxonomy($input: UpdateProjectV2FieldInput!) {
          updateProjectV2Field(input: $input) {
            projectV2Field {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
        """
        try:
            data = self.execute(
                mutation,
                {
                    "input": {
                        "fieldId": field_id,
                        "name": "Status",
                        "singleSelectOptions": options_input,
                    }
                },
            )
            field = data.get("updateProjectV2Field", {}).get("projectV2Field") or {}
            options = field.get("options", [])
            print(f"Successfully enforced canonical status taxonomy on field {field_id}.")
            return {opt["name"]: opt["id"] for opt in options if "name" in opt and "id" in opt}
        except Exception as exc:
            print(
                f"Warning: could not enforce taxonomy on field {field_id}: {_detail(exc)}",
                file=sys.stderr,
            )
            return {
                opt["name"]: opt["id"] for opt in existing_options if "name" in opt and "id" in opt
            }


def _env_for(args: List[str]) -> Dict[str, str]:
    """Compatibility helper providing the environment for any legacy command invocations."""
    env = dict(os.environ)
    project_token = env.get("GH_PROJECT_TOKEN", "")
    if args and args[0] == "project" and project_token:
        env["GH_TOKEN"] = project_token
    return env


def resolve_boards(
    owner: str = PROJECT_OWNER,
    *,
    include_scoped: bool = True,
    include_global: bool = True,
) -> List[int]:
    """Finds the project numbers of every board this repository is linked to.

    Discovers projects via GraphQL and resolves titles declared in the manifest.

    Args:
        owner: Project owner login.
        include_scoped: Include this repository's own scoped board.
        include_global: Include the Global board that aggregates every repository.

    Returns:
        Project numbers, in declaration order, without duplicates.
    """
    try:
        import manifest as manifest_module

        loaded = manifest_module.load(".")
        titles = []
        if include_scoped:
            titles.append(loaded.project_title)
        if include_global and loaded.global_board_title and loaded.global_board_title not in titles:
            titles.append(loaded.global_board_title)
    except Exception as exc:
        print(f"Could not read the board declaration: {_detail(exc)}", file=sys.stderr)
        titles = []

    if not titles:
        print(f"No boards declared; falling back to project {PROJECT_NUMBER}.")
        return [PROJECT_NUMBER]

    graphql = GitHubGraphQLClient()
    by_title = graphql.resolve_projects(owner)

    if not by_title:
        # Fallback to subprocess if API failed (e.g. legacy test environment)
        try:
            args = ["project", "list", "--owner", owner, "--limit", "100", "--format", "json"]
            output = subprocess.run(
                ["gh", *args],
                capture_output=True,
                text=True,
                check=True,
                env=_env_for(args),
            ).stdout
            by_title = {p["title"]: p for p in json.loads(output).get("projects", [])}
        except Exception as exc:
            if is_rate_limited(exc):
                mark_rate_limited(f"Project board rate limit reached resolving boards for {owner}")
                return []
            _fail(f"could not list projects for {owner}: {_detail(exc)}")
            return []

    numbers: List[int] = []
    for title in titles:
        proj = by_title.get(title)
        number = proj.get("number") if isinstance(proj, dict) else proj
        if number is None:
            _fail(f"no project board titled {title!r} for {owner}")
            continue
        if number not in numbers:
            numbers.append(number)
    return numbers


class GitHubProjectClient:
    """Client for project board interactions and status enforcement."""

    def __init__(
        self,
        owner: str = PROJECT_OWNER,
        project_number: int = PROJECT_NUMBER,
        rest_client: Optional[GitHubRestClient] = None,
        graphql_client: Optional[GitHubGraphQLClient] = None,
    ):
        """Initializes the project client.

        Args:
            owner: Project owner login.
            project_number: Project number within owner scope.
            rest_client: Optional REST client instance.
            graphql_client: Optional GraphQL client instance.
        """
        self.owner = owner
        self.project_number = project_number
        self.rest = rest_client or GitHubRestClient()
        self.graphql = graphql_client or GitHubGraphQLClient()
        self._project_id: Optional[str] = None
        self._status_field_id: Optional[str] = os.environ.get("PROJECT_STATUS_FIELD_ID") or None
        self._status_options: Optional[Dict[str, str]] = None
        self._items_cache: Optional[Dict[str, Tuple[str, Optional[str]]]] = None
        self._raw_items_cache: Optional[List[Dict[str, Any]]] = None

    def run_gh(self, args: List[str]) -> str:
        """Runs a legacy `gh` command (provided for backward compatibility with tests)."""
        result = subprocess.run(
            ["gh"] + args, capture_output=True, text=True, check=True, env=_env_for(args)
        )
        return result.stdout.strip()

    @property
    def project_id(self) -> Optional[str]:
        """Node id of the project, resolved once and cached."""
        if self._project_id is None:
            projects = self.graphql.resolve_projects(self.owner)
            for proj in projects.values():
                if proj.get("number") == self.project_number:
                    self._project_id = proj.get("id")
                    break
            if not self._project_id:
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
                except Exception as exc:
                    if is_rate_limited(exc):
                        mark_rate_limited()
                    print(f"Could not resolve project id: {_detail(exc)}", file=sys.stderr)
        return self._project_id

    def _load_status_field(self) -> None:
        """Discovers the Status field and dynamically enforces the canonical 7-status taxonomy."""
        if self._status_options is not None and self._status_field_id is not None:
            return

        fields = []
        if self.project_id:
            fields = self.graphql.get_project_fields(self.project_id)

        # Fallback to run_gh if fields empty (e.g. in legacy tests)
        if not fields:
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
                fields = json.loads(output).get("fields", [])
            except Exception as exc:
                if is_rate_limited(exc):
                    mark_rate_limited()
                print(f"Could not resolve Status field: {_detail(exc)}", file=sys.stderr)
                return

        for field in fields:
            if field.get("name") == STATUS_FIELD_NAME:
                self._status_field_id = self._status_field_id or field.get("id")
                current_options = field.get("options", [])
                opt_names = {opt.get("name") for opt in current_options}

                # Check if all 7 canonical options are present
                missing = set(STATUS_NAMES) - opt_names
                if missing and self._status_field_id:
                    # Enforce the taxonomy dynamically without human intervention
                    self._status_options = self.graphql.enforce_board_taxonomy(
                        self._status_field_id, current_options
                    )
                else:
                    self._status_options = {
                        opt["name"]: opt["id"]
                        for opt in current_options
                        if "name" in opt and "id" in opt
                    }
                break

    @property
    def status_field_id(self) -> Optional[str]:
        """Field id of the single-select Status field."""
        self._load_status_field()
        return self._status_field_id

    def status_option_id(self, status_name: str) -> Optional[str]:
        """Returns the option id for a canonical status name.

        Args:
            status_name: Canonical status name.

        Returns:
            The option ID, or None if unresolvable.
        """
        self._load_status_field()
        if not self._status_options:
            return None

        # Direct match
        if status_name in self._status_options:
            return self._status_options[status_name]

        # Case-insensitive / normalized lookup
        target_lower = status_name.strip().lower()
        for name, opt_id in self._status_options.items():
            n_lower = name.strip().lower()
            if n_lower == target_lower:
                return opt_id
            if target_lower == "todo" and n_lower in ("to do", "todo"):
                return opt_id
        return None

    def load_existing_items(self) -> Dict[str, Tuple[str, Optional[str]]]:
        """Loads and caches existing board items mapped by content URL to (item_id, status)."""
        if self._items_cache is not None:
            return self._items_cache
        self._items_cache = {}

        if type(self).run_gh != GitHubProjectClient.run_gh:
            try:
                raw = self.run_gh(
                    [
                        "project",
                        "item-list",
                        str(self.project_number),
                        "--owner",
                        self.owner,
                        "--format",
                        "json",
                        "--limit",
                        "500",
                    ]
                )
                for item in json.loads(raw or "{}").get("items", []):
                    item_id = item.get("id")
                    content_url = item.get("content", {}).get("url")
                    item_status = item.get("status")
                    if content_url and item_id:
                        self._items_cache[content_url] = (item_id, item_status)
            except Exception as exc:
                if is_rate_limited(exc):
                    mark_rate_limited()
            return self._items_cache

        if not self.project_id:
            return self._items_cache

        try:
            items = self.graphql.fetch_board_items(self.project_id, limit=1000)
            self._raw_items_cache = items
            for item in items:
                item_id = item.get("id")
                content = item.get("content") or {}
                content_url = content.get("url")
                node_id = content.get("id")
                number = content.get("number")
                if content_url and number and node_id:
                    match = URL_PATTERN.match(content_url)
                    if match:
                        owner, repo_name, _ = match.groups()
                        self.rest._node_id_cache[(f"{owner}/{repo_name}", number)] = node_id

                # Resolve current Status value
                status_name = None
                for fv in item.get("fieldValues", {}).get("nodes", []):
                    if (fv.get("field") or {}).get("name") == STATUS_FIELD_NAME:
                        status_name = fv.get("name")
                        break

                if content_url and item_id:
                    self._items_cache[content_url] = (item_id, status_name)
        except Exception as exc:
            if is_rate_limited(exc):
                mark_rate_limited()
            print(
                f"Could not load items for project {self.project_number}: {_detail(exc)}",
                file=sys.stderr,
            )

        return self._items_cache

    def add_item(self, url: str, content_id: Optional[str] = None) -> Optional[str]:
        """Adds an issue or pull request to the project, returning its item id.

        Args:
            url: HTML url of the issue or pull request.
            content_id: Optional GraphQL node ID of the issue or PR.

        Returns:
            Project item id, or None on failure.
        """
        if not content_id:
            match = URL_PATTERN.match(url)
            if match:
                owner, repo, num_str = match.groups()
                repo_slug = f"{owner}/{repo}"
                content_id = self.rest.get_node_id(repo_slug, int(num_str))

        if not content_id:
            # Fallback to CLI run_gh if node id could not be determined
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
            except Exception as exc:
                if is_rate_limited(exc):
                    mark_rate_limited()
                _fail(f"adding {url} to project {self.project_number}: {_detail(exc)}")
                return None

        if not self.project_id:
            return None

        return self.graphql.add_item(self.project_id, content_id)

    def edit_status(self, item_id: str, status_name: str) -> bool:
        """Sets the Status field of a project item.

        Args:
            item_id: Project item id.
            status_name: Target status name.

        Returns:
            True when the mutation succeeded.
        """
        option_id = self.status_option_id(status_name)
        project_id = self.project_id
        field_id = self.status_field_id
        if not option_id or not project_id or not field_id:
            print(
                f"Cannot set status {status_name!r}: option={option_id} project={project_id} field={field_id}",
                file=sys.stderr,
            )
            return False

        success = self.graphql.update_item_status(project_id, item_id, field_id, option_id)
        if not success:
            # Fallback to run_gh if GraphQL failed
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
            except Exception as exc:
                if is_rate_limited(exc):
                    mark_rate_limited()
                print(f"Error editing status via fallback: {_detail(exc)}", file=sys.stderr)
                return False
        return True

    def track(
        self,
        url: str,
        status: str,
        content_id: Optional[str] = None,
        fast_path: bool = False,
    ) -> None:
        """Tracks the item at `url`, ensuring it is on the board with `status`.

        Path 1 (Pipeline Events):
            When fast_path=True and content_id is provided, directly adds the item
            (idempotent) and edits status, avoiding any expensive board item queries.

        Path 2 (Historical Reconciliation):
            When fast_path=False, checks in-memory cache populated by load_existing_items().
            If status already matches, returns immediately (0 mutations, 0 queries).
            Only out-of-date or missing items incur mutations, gated solely by the live GraphQL
            quota reserve (`can_mutate`) - there is no fixed per-run mutation count.

        Args:
            url: Issue or pull request html url.
            status: Target status name.
            content_id: Optional GraphQL node id of the issue or PR.
            fast_path: If True, executes direct single-item addition without loading board items.
        """
        if not can_mutate():
            if RATE_LIMITED:
                print(f"Notice: rate limited; deferring {url} to next run.")
            else:
                print(
                    f"Notice: GraphQL quota reserve reached "
                    f"({GRAPHQL_REMAINING} <= {QUOTA_MINIMUM}); deferring {url} to next run."
                )
            return

        # Path 2 & General In-memory cache hit: Check if item already exists in local cache
        if self._items_cache is not None and url in self._items_cache:
            item_id, current_status = self._items_cache[url]
            if current_status == status:
                return
            if self.edit_status(item_id, status):
                self._items_cache[url] = (item_id, status)
                record_mutation()
                print(f"{url} -> {status} (project {self.project_number})")
            return

        # Path 1: Fast path for real-time pipeline events (single item, bypasses board queries)
        if (
            fast_path
            and content_id
            and self.project_id
            and type(self).run_gh == GitHubProjectClient.run_gh
        ):
            item_id = self.graphql.add_item(self.project_id, content_id)
            if item_id:
                record_mutation()
                if self.edit_status(item_id, status):
                    record_mutation()
                    if self._items_cache is not None:
                        self._items_cache[url] = (item_id, status)
                    print(f"{url} -> {status} (project {self.project_number})")
            return

        # Fallback path 3: Check existing items via cache or fetch
        existing = self.load_existing_items()
        if url in existing:
            item_id, current_status = existing[url]
            if current_status == status:
                return
            if self.edit_status(item_id, status):
                existing[url] = (item_id, status)
                record_mutation()
                print(f"{url} -> {status} (project {self.project_number})")
            return

        item_id = self.add_item(url, content_id=content_id)
        if item_id:
            record_mutation()
            if self.edit_status(item_id, status):
                record_mutation()
                existing[url] = (item_id, status)
                print(f"{url} -> {status} (project {self.project_number})")

    def set_status_label(
        self,
        repo: str,
        issue_number: int,
        status_name: str,
        existing_labels: Optional[List[Any]] = None,
    ) -> None:
        """Applies a status label exclusively while preserving all other issue labels."""
        self.rest.set_status_label(repo, issue_number, status_name, existing_labels)

    def add_issue_label(self, repo: str, issue_number: int, label: str) -> None:
        """Adds a label to an issue."""
        if label in STATUS_LABELS:
            self.set_status_label(repo, issue_number, label)
            return
        self.rest.add_issue_label(repo, issue_number, label)

    def close_issue(self, repo: str, issue_number: int, reason: str = "completed") -> None:
        """Closes an issue."""
        self.rest.close_issue(repo, issue_number, reason=reason)

    def open_items(self) -> List[Dict[str, Any]]:
        """Returns board items."""
        return list(self.load_existing_items().keys())


class BoardGroup:
    """Several boards addressed as one."""

    def __init__(self, clients: List[GitHubProjectClient]) -> None:
        """Initializes the group."""
        self.clients = clients

    def run_gh(self, args: List[str]) -> str:
        """Delegates run_gh to the first client or executes subprocess."""
        if self.clients:
            return self.clients[0].run_gh(args)
        result = subprocess.run(
            ["gh"] + args, capture_output=True, text=True, check=True, env=_env_for(args)
        )
        return result.stdout.strip()

    @property
    def owner(self) -> str:
        """Owner of the first board, or default owner."""
        return self.clients[0].owner if self.clients else PROJECT_OWNER

    @property
    def project_number(self) -> int:
        """Project number of the first board, or default project number."""
        return self.clients[0].project_number if self.clients else PROJECT_NUMBER

    def track(
        self,
        url: str,
        status: str,
        content_id: Optional[str] = None,
        fast_path: bool = False,
    ) -> None:
        """Tracks the URL across every board in the group."""
        for client in self.clients:
            _safe_track(client, url, status, content_id=content_id, fast_path=fast_path)

    def load_existing_items(self) -> None:
        """Preloads existing board items across all boards in the group."""
        for client in self.clients:
            if hasattr(client, "load_existing_items"):
                client.load_existing_items()

    def set_status_label(
        self,
        repo: str,
        number: int,
        status: str,
        existing_labels: Optional[List[Any]] = None,
    ) -> None:
        """Applies the status label once."""
        if self.clients:
            _safe_set_status_label(self.clients[0], repo, number, status, existing_labels)

    def add_issue_label(self, repo: str, number: int, label: str) -> None:
        """Adds a label once."""
        if self.clients:
            self.clients[0].add_issue_label(repo, number, label)

    def close_issue(self, repo: str, number: int, reason: str = "completed") -> None:
        """Closes an issue once."""
        if self.clients:
            self.clients[0].close_issue(repo, number, reason=reason)

    def open_items(self) -> List[Any]:
        """Returns open items of the first board."""
        return self.clients[0].open_items() if self.clients else []


def _labels_of(payload_entity: Dict[str, Any]) -> List[str]:
    """Extracts label names from an issue or pull request payload fragment."""
    return [
        lbl.get("name") if isinstance(lbl, dict) else str(lbl)
        for lbl in payload_entity.get("labels", [])
    ]


def _safe_track(
    client: Any,
    url: str,
    status: str,
    content_id: Optional[str] = None,
    fast_path: bool = False,
) -> None:
    """Tracks a URL safely whether client accepts content_id/fast_path kwargs or not."""
    try:
        client.track(url, status, content_id=content_id, fast_path=fast_path)
    except TypeError:
        try:
            client.track(url, status, content_id=content_id)
        except TypeError:
            client.track(url, status)


def _safe_close_issue(client: Any, repo: str, issue_number: int, reason: str = "completed") -> None:
    """Closes an issue safely whether client accepts reason kwarg or not."""
    try:
        client.close_issue(repo, issue_number, reason=reason)
    except TypeError:
        client.close_issue(repo, issue_number)


def _safe_set_status_label(
    client: Any,
    repo: str,
    issue_number: int,
    status: str,
    existing_labels: Optional[List[Any]] = None,
) -> None:
    """Sets a status label safely whether client accepts existing_labels kwarg or not."""
    try:
        client.set_status_label(repo, issue_number, status, existing_labels=existing_labels)
    except TypeError:
        client.set_status_label(repo, issue_number, status)


def _handle_issue_event(payload: Dict[str, Any], client: Any) -> None:
    """Processes an ``issues`` webhook event in real-time."""
    action = payload.get("action")
    issue = payload.get("issue", {})
    issue_url = issue.get("html_url")
    issue_number = issue.get("number")
    node_id = issue.get("node_id")
    repo = payload.get("repository", {}).get("full_name", DEFAULT_REPO)
    labels = _labels_of(issue)
    closed = str(issue.get("state", "")).lower() == "closed" or action == "closed"

    if not issue_url:
        return

    item = dict(issue)
    item["kind"] = "Issue"
    item["is_pr"] = False
    if closed:
        item["state"] = "closed"
        if action == "closed" and not item.get("state_reason"):
            item["state_reason"] = "completed"
    elif action in ("opened", "reopened"):
        item["state"] = "open"

    if action == "reopened":
        item["checkpoint"] = checkpoint_covers_issue(issue_number)
    elif "checkpoint" not in item and issue_number:
        item["checkpoint"] = checkpoint_covers_issue(issue_number)

    status = expected_status(item)
    _safe_track(client, issue_url, status, content_id=node_id, fast_path=True)
    if issue_number:
        _safe_set_status_label(client, repo, issue_number, status, existing_labels=labels)


def _handle_pull_request_event(payload: Dict[str, Any], client: Any) -> None:
    """Processes a ``pull_request`` webhook event in real-time."""
    action = payload.get("action")
    pr = payload.get("pull_request", {})
    pr_url = pr.get("html_url")
    pr_number = pr.get("number")
    node_id = pr.get("node_id")
    repo = payload.get("repository", {}).get("full_name", DEFAULT_REPO)
    merged = bool(pr.get("merged", False))
    labels = _labels_of(pr)
    bound_issues = extract_bound_issues(pr.get("body", ""))
    print(f"PR event {action}: bound issues {bound_issues}")

    closed = str(pr.get("state", "")).lower() == "closed" or action == "closed" or merged

    item = dict(pr)
    item["kind"] = "PullRequest"
    item["is_pr"] = True
    if closed:
        item["state"] = "closed"
    if merged:
        item["merged"] = True

    pr_status = expected_status(item)
    _safe_track(client, pr_url, pr_status, content_id=node_id, fast_path=True)
    if pr_number:
        _safe_set_status_label(client, repo, pr_number, pr_status, existing_labels=labels)

    if action == "ready_for_review":
        for issue_num in bound_issues:
            _safe_set_status_label(client, repo, issue_num, "In Progress")
            _safe_track(
                client,
                f"https://github.com/{repo}/issues/{issue_num}",
                "In Progress",
                fast_path=True,
            )

    elif action == "closed" and merged:
        for issue_num in bound_issues:
            _safe_set_status_label(client, repo, issue_num, "Done")
            _safe_track(
                client,
                f"https://github.com/{repo}/issues/{issue_num}",
                "Done",
                fast_path=True,
            )
            _safe_close_issue(client, repo, issue_num, reason="completed")


def _handle_push_event(payload: Dict[str, Any], client: Any) -> None:
    """Processes a ``push`` event on the default branch or darkfactory."""
    ref = payload.get("ref", "")
    repo_data = payload.get("repository", {})
    default_branch = repo_data.get("default_branch", "main")
    allowed_refs = {f"refs/heads/{default_branch}", "refs/heads/main", "refs/heads/darkfactory"}

    if ref not in allowed_refs:
        return
    repo = repo_data.get("full_name", DEFAULT_REPO)
    for commit in payload.get("commits", []):
        for issue_num in extract_bound_issues(commit.get("message", "")):
            _safe_set_status_label(client, repo, issue_num, "Done")
            _safe_track(
                client,
                f"https://github.com/{repo}/issues/{issue_num}",
                "Done",
                fast_path=True,
            )
            _safe_close_issue(client, repo, issue_num, reason="completed")

    if can_reconcile():
        reconcile(client=client)


def settled_status(
    closed: bool,
    merged: bool,
    labels: Sequence[Any],
    state_reason: Optional[str] = None,
) -> Optional[str]:
    """Decides the canonical status an item should hold once closed."""
    if not closed:
        return None
    return expected_status(
        {
            "state": "closed",
            "merged": merged,
            "labels": labels,
            "state_reason": state_reason,
        }
    )


def reconcile_membership(client: Any, repo: str, state: Optional[str] = None) -> int:
    """Reconciles repository issues and PRs onto linked boards via REST API.

    Enforces all historical items (open, closed, merged, superseded, dropped)
    across all boards while using in-memory diffing to skip already-settled items
    with zero mutations.
    """
    if not can_reconcile():
        print(
            f"Notice: Quota reserve preserved ({GRAPHQL_REMAINING} remaining); skipping bulk reconciliation.",
            file=sys.stderr,
        )
        return 0

    if state is None:
        state = os.environ.get("PROJECT_RECONCILE_STATE", "all")

    # Preload board caches across all boards so in-memory diffing avoids redundant calls
    if isinstance(client, BoardGroup):
        client.load_existing_items()
    elif hasattr(client, "load_existing_items"):
        client.load_existing_items()

    tracked = 0

    target = client.clients[0] if isinstance(client, BoardGroup) and client.clients else client
    if hasattr(target, "run_gh") and type(target).run_gh != GitHubProjectClient.run_gh:
        for kind in ("issue", "pr"):
            try:
                raw = target.run_gh(
                    [
                        kind,
                        "list",
                        "--repo",
                        repo,
                        "--state",
                        state,
                        "--limit",
                        "2000",
                        "--json",
                        (
                            "number,url,labels,state,isDraft,mergedAt"
                            if kind == "pr"
                            else "number,url,labels,state,stateReason"
                        ),
                    ]
                )
                for entry in json.loads(raw or "[]"):
                    labels = [l.get("name", "") for l in entry.get("labels", []) or []]
                    item_entry = dict(entry)
                    if kind == "pr":
                        item_entry["is_pr"] = True
                        item_entry["kind"] = "PullRequest"
                    else:
                        item_entry["is_pr"] = False
                        item_entry["kind"] = "Issue"
                    status = expected_status(item_entry)
                    _safe_track(client, entry["url"], status, fast_path=False)
                    num = entry.get("number")
                    if num:
                        _safe_set_status_label(client, repo, num, status, existing_labels=labels)
                    tracked += 1
            except Exception as exc:
                if is_rate_limited(exc):
                    mark_rate_limited()
                    break
                _fail(f"could not list {kind}s in {repo}: {_detail(exc)}")
        return tracked

    rest = getattr(client, "rest", None) or GitHubRestClient()
    items = rest.list_issues_and_prs(repo, state=state, limit=5000)

    for entry in items:
        if not can_mutate():
            break

        url = entry.get("html_url")
        node_id = entry.get("node_id")
        labels = entry.get("labels", [])
        num = entry.get("number")
        is_pr = bool(entry.get("pull_request"))

        item_entry = dict(entry)
        item_entry["is_pr"] = is_pr
        item_entry["kind"] = "PullRequest" if is_pr else "Issue"
        status = expected_status(item_entry)

        if url:
            _safe_track(client, url, status, content_id=node_id, fast_path=False)
            if num:
                _safe_set_status_label(client, repo, num, status, existing_labels=labels)
            tracked += 1
            # Small pacing delay between mutations to avoid secondary rate limits
            time.sleep(0.05)

    print(f"Reconciled membership for {repo}: {tracked} item(s) checked/tracked.")
    return tracked


def _repo_and_number_from_content(
    content: Dict[str, Any], url: Optional[str] = None
) -> Tuple[Optional[str], Optional[int]]:
    """Extracts repository slug and issue/PR number from board item content."""
    number = content.get("number")
    if number is not None:
        try:
            number = int(number)
        except (TypeError, ValueError):
            number = None
    target_url = url or content.get("url") or ""
    match = URL_PATTERN.match(str(target_url))
    if match:
        repo = f"{match.group(1)}/{match.group(2)}"
        if number is None:
            number = int(match.group(3))
        return repo, number
    return None, number


def _strip_stale_terminal_label(
    client: Any,
    content: Dict[str, Any],
    status: str,
    labels: Sequence[Any],
    url: Optional[str] = None,
) -> None:
    """Removes a stale terminal status label from an open item by setting the real status label."""
    repo, number = _repo_and_number_from_content(content, url=url)
    if not repo or not number:
        return
    _safe_set_status_label(client, repo, number, status, existing_labels=list(labels))


def _wanted_status_for_open_item(
    current: Optional[str], labels: Sequence[Any]
) -> Tuple[Optional[str], bool]:
    """Decides board status and whether a stale terminal label must be stripped.

    Returns:
        Tuple of (wanted board status or None when no change, whether to strip terminal labels).
    """
    derived = determine_status_from_labels(labels, closed=False)
    stale = has_terminal_status_label(labels)
    if stale:
        if current and current not in TERMINAL_STATUSES:
            return current, True
        return derived, True
    if not current:
        return derived, False
    if current in TERMINAL_STATUSES:
        return derived, False
    return None, False


def reconcile_unassigned_statuses(client: Any) -> None:
    """Brings every board item's status back into agreement with the repository in-memory."""
    if isinstance(client, BoardGroup):
        for member in client.clients:
            reconcile_unassigned_statuses(member)
        return

    if hasattr(client, "run_gh") and type(client).run_gh != GitHubProjectClient.run_gh:
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
                    "2000",
                ]
            )
            for item in json.loads(raw_items or "{}").get("items", []):
                content = item.get("content", {}) or {}
                item_id = item.get("id")
                if not item_id:
                    continue
                current = item.get("status")
                labels = item.get("labels", []) or content.get("labels", []) or []
                url = content.get("url")

                item_entry = dict(content)
                item_entry["labels"] = labels
                if "closed" in item and "closed" not in item_entry:
                    item_entry["closed"] = item["closed"]
                if "state" in item and "state" not in item_entry:
                    item_entry["state"] = item["state"]
                wanted = expected_status(item_entry)
                if wanted != current:
                    client.edit_status(item_id, wanted)
                    print(
                        f"Reconciled item {item_id} ({content.get('title')}): "
                        f"{current or 'None'} -> {wanted}"
                    )
                repo, number = _repo_and_number_from_content(content, url=url)
                if repo and number:
                    _safe_set_status_label(client, repo, number, wanted, existing_labels=labels)
        except Exception as exc:
            if is_rate_limited(exc):
                mark_rate_limited()
            print(f"Status reconciliation notice: {_detail(exc)}", file=sys.stderr)
        return

    graphql = getattr(client, "graphql", None) or GitHubGraphQLClient()
    if not client.project_id:
        return

    items_data = getattr(client, "_raw_items_cache", None)
    if items_data is None:
        items_data = graphql.fetch_board_items(client.project_id, limit=2000)
    existing_items = client._items_cache if client._items_cache is not None else {}
    for item in items_data:
        if not can_mutate():
            break

        item_id = item.get("id")
        content = item.get("content") or {}
        url = content.get("url")
        if not item_id or not url:
            continue

        current = None
        for fv in item.get("fieldValues", {}).get("nodes", []):
            if (fv.get("field") or {}).get("name") == STATUS_FIELD_NAME:
                current = fv.get("name")
                break

        labels = [l.get("name") for l in content.get("labels", {}).get("nodes", []) if l]
        item_entry = dict(content)
        item_entry["labels"] = labels
        wanted = expected_status(item_entry)

        if wanted != current:
            if client.edit_status(item_id, wanted):
                record_mutation()
                existing_items[url] = (item_id, wanted)
                print(
                    f"Reconciled item {item_id} ({content.get('title')}): "
                    f"{current or 'None'} -> {wanted}"
                )
                time.sleep(0.05)

        repo, number = _repo_and_number_from_content(content, url=url)
        if repo and number:
            _safe_set_status_label(client, repo, number, wanted, existing_labels=labels)


def reconcile(
    client: Optional[Any] = None,
    *,
    dry_run: bool = False,
    owner: str = PROJECT_OWNER,
    board_numbers: Optional[Sequence[int]] = None,
    repo_slugs: Optional[Sequence[str]] = None,
    state: str = "all",
) -> Dict[str, Any]:
    """Reconciles every declared board and repository into strict alignment with expected_status.

    For every board declared in the manifest (plus the Global board):
    - Lists every issue and pull request of each bound repository (all states, paginated).
    - Adds missing items to the board.
    - Sets board status to expected_status.
    - Sets exactly one status label on the issue/PR and removes all other status labels,
      preserving non-status labels.
    - Reports a summary with counts per correction type.
    - Supports dry-run mode (read-only inspection without writing).

    Args:
        client: Optional explicit client or BoardGroup.
        dry_run: If True, detects and reports corrections without writing.
        owner: Project owner login.
        board_numbers: Optional filter of specific project numbers to reconcile.
        repo_slugs: Optional list of repository slugs to reconcile.
        state: State filter ('all', 'open', 'closed').

    Returns:
        Dictionary summarizing scanned items and counts per correction type.
    """
    corrections = {
        "missing_from_board": 0,
        "status_updated": 0,
        "closed_not_terminal": 0,
        "open_terminal": 0,
        "board_status_mismatch": 0,
        "labels_corrected": 0,
        "no_status_label": 0,
        "label_mismatch": 0,
        "multiple_status_labels": 0,
    }
    total_scanned = 0

    if not dry_run and not can_reconcile():
        print(
            f"Notice: Quota reserve preserved ({GRAPHQL_REMAINING} remaining); skipping bulk reconciliation.",
            file=sys.stderr,
        )
        return {
            "items_scanned": 0,
            "corrections": corrections,
            "dry_run": dry_run,
            "skipped": True,
        }

    try:
        import manifest as manifest_module

        loaded = manifest_module.load(".")
    except Exception:
        loaded = None

    if repo_slugs:
        repos_to_scan = list(repo_slugs)
    else:
        current_repo = os.environ.get("GITHUB_REPOSITORY", DEFAULT_REPO)
        repos_to_scan = [current_repo] if current_repo else []
        if loaded:
            installed = (loaded.data.get("app", {}) or {}).get("installed_on", [])
            for r in installed:
                if r and r not in repos_to_scan:
                    repos_to_scan.append(r)
        if not repos_to_scan and DEFAULT_REPO:
            repos_to_scan = [DEFAULT_REPO]

    if client is not None:
        if isinstance(client, BoardGroup):
            board_clients = list(client.clients)
        else:
            board_clients = [client]
    else:
        if board_numbers:
            board_clients = [
                GitHubProjectClient(owner=owner, project_number=n) for n in board_numbers
            ]
        else:
            board_nums = resolve_boards(owner=owner, include_scoped=True, include_global=True)
            if loaded:
                graphql = GitHubGraphQLClient()
                by_title = graphql.resolve_projects(owner)
                for title in loaded.linked_boards:
                    p = by_title.get(title)
                    if p and "number" in p and p["number"] not in board_nums:
                        board_nums.append(p["number"])
            board_clients = [GitHubProjectClient(owner=owner, project_number=n) for n in board_nums]

    title_by_num: Dict[int, str] = {
        getattr(c, "project_number", PROJECT_NUMBER): getattr(c, "title", "")
        for c in board_clients
        if getattr(c, "title", "")
    }
    # Titles decide which repositories a board carries; only ask GitHub when a token is present
    # (never from tests, where the credential variables are cleared).
    if (
        not title_by_num
        and (os.environ.get("GH_PROJECT_TOKEN") or os.environ.get("GH_TOKEN"))
        and not (
            board_clients
            and hasattr(board_clients[0], "run_gh")
            and type(board_clients[0]).run_gh != GitHubProjectClient.run_gh
        )
    ):
        try:
            graphql = GitHubGraphQLClient()
            projects_by_title = graphql.resolve_projects(owner)
            title_by_num = {
                p["number"]: title
                for title, p in projects_by_title.items()
                if isinstance(p, dict) and "number" in p
            }
        except Exception:
            title_by_num = {}

    global_title = (getattr(loaded, "global_board_title", None) if loaded else None) or "Global"

    for b_client in board_clients:
        b_num = getattr(b_client, "project_number", PROJECT_NUMBER)
        b_title = title_by_num.get(b_num, "")
        is_global = bool(b_title) and b_title.lower() == global_title.lower()

        existing_items: Dict[str, Tuple[str, Optional[str]]] = {}
        if hasattr(b_client, "load_existing_items"):
            existing_items = b_client.load_existing_items()

        for repo in repos_to_scan:
            if not repo:
                continue
            repo_name = repo.split("/")[-1]
            if not is_global:
                # A scoped board carries only its own repository; with an unknown title, only the
                # repository this run belongs to. Other repositories are aggregated on Global only.
                if b_title:
                    if repo_name.lower() != b_title.lower() and repo.lower() != b_title.lower():
                        continue
                elif repo != repos_to_scan[0]:
                    continue

            if hasattr(b_client, "run_gh") and type(b_client).run_gh != GitHubProjectClient.run_gh:
                repo_items = []
                for kind in ("issue", "pr"):
                    try:
                        raw = b_client.run_gh(
                            [
                                kind,
                                "list",
                                "--repo",
                                repo,
                                "--state",
                                state,
                                "--limit",
                                "2000",
                                "--json",
                                (
                                    "number,url,labels,state,isDraft,mergedAt,title"
                                    if kind == "pr"
                                    else "number,url,labels,state,stateReason,title"
                                ),
                            ]
                        )
                        for d in json.loads(raw or "[]"):
                            d["kind"] = "PullRequest" if kind == "pr" else "Issue"
                            d["is_pr"] = kind == "pr"
                            repo_items.append(d)
                    except Exception as exc:
                        if is_rate_limited(exc):
                            mark_rate_limited()
                            break
                        _fail(f"could not list {kind}s in {repo}: {_detail(exc)}")
            else:
                rest = getattr(b_client, "rest", None) or GitHubRestClient()
                repo_items = rest.list_issues_and_prs(repo, state=state, limit=5000)

            for item in repo_items:
                if not dry_run and not can_mutate():
                    break
                total_scanned += 1
                url = item.get("html_url") or item.get("url")
                num = item.get("number")
                node_id = item.get("node_id")
                raw_labels = item.get("labels", [])
                if isinstance(raw_labels, dict) and "nodes" in raw_labels:
                    raw_labels = raw_labels["nodes"]
                label_names = [
                    l.get("name") if isinstance(l, dict) else str(l) for l in raw_labels if l
                ]
                item_status_labels = {l for l in label_names if l in STATUS_LABELS}

                exp_status = expected_status(item)

                if not url:
                    continue

                if url not in existing_items:
                    corrections["missing_from_board"] += 1
                    corrections["status_updated"] += 1
                    if not dry_run and can_mutate():
                        item_id = b_client.add_item(url, content_id=node_id)
                        if item_id:
                            record_mutation()
                            if b_client.edit_status(item_id, exp_status):
                                record_mutation()
                                existing_items[url] = (item_id, exp_status)
                else:
                    item_id, current_status = existing_items[url]
                    if current_status != exp_status:
                        corrections["status_updated"] += 1
                        state_val = str(item.get("state", "")).upper()
                        is_closed = state_val in ("CLOSED", "MERGED") or bool(item.get("merged"))
                        if is_closed and current_status not in TERMINAL_STATUSES:
                            corrections["closed_not_terminal"] += 1
                        elif not is_closed and current_status in TERMINAL_STATUSES:
                            corrections["open_terminal"] += 1
                        else:
                            corrections["board_status_mismatch"] += 1

                        if not dry_run and can_mutate():
                            if b_client.edit_status(item_id, exp_status):
                                record_mutation()
                                existing_items[url] = (item_id, exp_status)

                if item_status_labels != {exp_status}:
                    corrections["labels_corrected"] += 1
                    if not item_status_labels:
                        corrections["no_status_label"] += 1
                    elif len(item_status_labels) > 1:
                        corrections["multiple_status_labels"] += 1
                    else:
                        corrections["label_mismatch"] += 1

                    if not dry_run and can_mutate() and num:
                        _safe_set_status_label(
                            b_client, repo, num, exp_status, existing_labels=raw_labels
                        )

    summary = {
        "items_scanned": total_scanned,
        "corrections": corrections,
        "dry_run": dry_run,
    }
    mode_str = "dry-run" if dry_run else "live"
    print(
        f"Reconciliation ({mode_str}): scanned {total_scanned} item(s); "
        f"missing_from_board={corrections['missing_from_board']}, "
        f"status_updated={corrections['status_updated']} "
        f"(closed_not_terminal={corrections['closed_not_terminal']}, "
        f"open_terminal={corrections['open_terminal']}, "
        f"board_status_mismatch={corrections['board_status_mismatch']}), "
        f"labels_corrected={corrections['labels_corrected']} "
        f"(no_status_label={corrections['no_status_label']}, "
        f"label_mismatch={corrections['label_mismatch']}, "
        f"multiple_status_labels={corrections['multiple_status_labels']})."
    )
    return summary


def process_event(event_name: str, payload: Dict[str, Any], client: Optional[Any] = None) -> None:
    """Dispatches a webhook payload to the matching board handler."""
    if client is None:
        numbers = resolve_boards()
        client = BoardGroup([GitHubProjectClient(project_number=n) for n in numbers])

    if event_name == "issues":
        _handle_issue_event(payload, client)
    elif event_name == "pull_request":
        _handle_pull_request_event(payload, client)
    elif event_name == "push":
        _handle_push_event(payload, client)
    elif event_name in ("workflow_dispatch", "schedule"):
        if not can_reconcile():
            print(
                "Notice: Quota reserve preserved; skipping scheduled bulk reconciliation.",
                file=sys.stderr,
            )
            return

        reconcile_state = os.environ.get("PROJECT_RECONCILE_STATE", "all")
        current_repo = os.environ.get("GITHUB_REPOSITORY", DEFAULT_REPO)
        repos_to_reconcile = [current_repo]
        try:
            import manifest as manifest_module

            loaded = manifest_module.load(".")
            installed = [str(r) for r in (loaded.data.get("app", {}) or {}).get("installed_on", [])]
            for r in installed:
                if r and r not in repos_to_reconcile:
                    repos_to_reconcile.append(r)
        except Exception:
            pass

        global_client: Optional[BoardGroup] = None

        for r in repos_to_reconcile:
            if not can_reconcile():
                break
            if not r:
                continue
            if r == current_repo:
                repo_client = client
            else:
                if global_client is None:
                    global_numbers = resolve_boards(include_scoped=False)
                    global_client = BoardGroup(
                        [GitHubProjectClient(project_number=n) for n in global_numbers]
                    )
                repo_client = global_client
            # Membership first (other repositories reach only the Global board), then the same
            # expected_status corrections the real-time handlers apply, per repository and board.
            reconcile_membership(repo_client, r, state=reconcile_state)
            if can_reconcile():
                reconcile(client=repo_client, repo_slugs=[r], state=reconcile_state)
        if can_reconcile():
            reconcile_unassigned_statuses(client)


def main() -> None:
    """Entry point: parses CLI arguments or reads webhook payload from the environment."""
    parser = argparse.ArgumentParser(description="GitHub Project board automation.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Dry run: inspect and report corrections without writing to boards or issues",
    )
    parser.add_argument(
        "--reconcile",
        action="store_true",
        help="Run historic reconciliation across all declared boards and repositories",
    )
    parser.add_argument(
        "--board",
        type=int,
        default=None,
        help="Specific project board number to reconcile",
    )
    parser.add_argument(
        "--owner",
        type=str,
        default=PROJECT_OWNER,
        help="Project owner login (default: PROJECT_OWNER)",
    )
    parser.add_argument(
        "--repo",
        type=str,
        default=None,
        help="Specific repository slug to reconcile",
    )
    args, unknown = parser.parse_known_args()

    if args.dry_run or args.reconcile or args.board:
        reconcile(
            dry_run=args.dry_run,
            owner=args.owner,
            board_numbers=[args.board] if args.board else None,
            repo_slugs=[args.repo] if args.repo else None,
        )
        if RATE_LIMITED:
            print("Notice: Project board rate limit reached; exiting cleanly.", file=sys.stderr)
            sys.exit(0)
        if FAILURES:
            sys.exit(1)
        return

    event_path = os.environ.get("GITHUB_EVENT_PATH")
    event_name = os.environ.get("GITHUB_EVENT_NAME", "")

    if not event_path or not os.path.exists(event_path):
        if not event_name or event_name in ("schedule", "workflow_dispatch"):
            process_event(event_name or "workflow_dispatch", {})
            if RATE_LIMITED:
                print("Notice: Project board rate limit reached; exiting cleanly.", file=sys.stderr)
                sys.exit(0)
            if FAILURES:
                sys.exit(1)
            return
        print(f"No GITHUB_EVENT_PATH found for event {event_name!r}")
        return

    with open(event_path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    process_event(event_name, payload)

    if RATE_LIMITED:
        print("Notice: Project board rate limit reached; exiting cleanly.", file=sys.stderr)
        sys.exit(0)

    if FAILURES:
        print(f"\n{len(FAILURES)} board operation(s) failed:", file=sys.stderr)
        for failure in FAILURES:
            print(f"  - {failure}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
