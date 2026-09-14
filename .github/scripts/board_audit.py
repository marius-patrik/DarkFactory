"""Read-only audit of a GitHub Projects v2 board against issue/PR reality."""

import collections
import json
import os
import subprocess
import sys
from typing import Any, Dict, List, Optional, Set, Tuple

# Ensure current script directory is on sys.path for local imports
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

import project_automation
from project_automation import (
    STATUS_LABELS,
    TERMINAL_STATUSES,
    expected_status,
)


def run_gh_json(cmd: List[str], repo: Optional[str] = None) -> Any:
    """Runs a GitHub CLI command safely and parses the JSON stdout.

    Decodes raw bytes with utf-8 replace to prevent Windows charmap decode crashes.
    """
    env = dict(os.environ)
    project_token = env.get("GH_PROJECT_TOKEN", "")
    if cmd and cmd[0] == "project" and project_token:
        env["GH_TOKEN"] = project_token
    full_cmd = ["gh", *cmd]
    if repo:
        full_cmd.extend(["-R", repo])
    proc = subprocess.run(full_cmd, capture_output=True, env=env)
    if proc.returncode != 0:
        err_msg = proc.stderr.decode("utf-8", "replace").strip()
        raise RuntimeError(
            f"Command 'gh {' '.join(full_cmd)}' failed (code {proc.returncode}): {err_msg}"
        )
    out = proc.stdout.decode("utf-8", "replace").strip()
    return json.loads(out) if out else {}


def audit_board(owner: str, number: str) -> Dict[str, Any]:
    """Audits a project board against live GitHub issues and PRs.

    Args:
        owner: GitHub owner (user or organization).
        number: Project number.

    Returns:
        Dictionary with audit results (items count, by_status, problems, examples).
    """
    raw_board = run_gh_json(
        [
            "project",
            "item-list",
            str(number),
            "--owner",
            owner,
            "--limit",
            "1000",
            "--format",
            "json",
        ]
    )
    items = raw_board.get("items", [])

    live: Dict[Tuple[str, str, int], Dict[str, Any]] = {}
    repos = sorted({(it.get("content") or {}).get("repository", "") for it in items} - {""})

    # Also include manifest repository if available
    try:
        import manifest as manifest_module

        loaded = manifest_module.load(".")
        if loaded.slug and loaded.slug not in repos:
            repos.append(loaded.slug)
        for inst in (loaded.data.get("app", {}) or {}).get("installed_on", []):
            if inst and inst not in repos:
                repos.append(inst)
    except Exception:
        pass

    for repo in repos:
        for kind, cmd in (
            (
                "Issue",
                [
                    "issue",
                    "list",
                    "--state",
                    "all",
                    "--limit",
                    "2000",
                    "--json",
                    "number,state,stateReason,labels,title,url",
                ],
            ),
            (
                "PullRequest",
                [
                    "pr",
                    "list",
                    "--state",
                    "all",
                    "--limit",
                    "2000",
                    "--json",
                    "number,state,isDraft,labels,title,mergedAt,url",
                ],
            ),
        ):
            try:
                data = run_gh_json(cmd, repo=repo)
                if isinstance(data, list):
                    for d in data:
                        d["kind"] = kind
                        d["is_pr"] = kind == "PullRequest"
                        live[(repo, kind, d["number"])] = d
            except Exception as exc:
                print(f"Warning: could not fetch {kind}s for {repo}: {exc}", file=sys.stderr)

    problems = collections.Counter()
    examples = collections.defaultdict(list)
    by_status = collections.Counter()
    board_seen: Set[Tuple[str, str, int]] = set()

    for it in items:
        status = it.get("status") or "(none)"
        by_status[status] += 1
        content = it.get("content") or {}
        kind = content.get("type", "")
        num = content.get("number")
        repo = content.get("repository", "")
        if kind not in ("Issue", "PullRequest"):
            continue
        board_seen.add((repo, kind, num))
        d = live.get((repo, kind, num))
        if d is None:
            problems["unreadable"] += 1
            continue
        state = d.get("state", "")
        labels = {l["name"] if isinstance(l, dict) else str(l) for l in d.get("labels", [])}
        status_labels = labels & STATUS_LABELS
        ref = f"{repo.split('/')[-1]}#{num}"

        def flag(key: str) -> None:
            problems[key] += 1
            if len(examples[key]) < 6:
                examples[key].append(f"{ref} [{status}] {d['title'][:50]}")

        closed = state in ("CLOSED", "MERGED")
        exp = expected_status(d)

        if closed and status not in TERMINAL_STATUSES:
            flag("closed but board not terminal")
        if not closed and status in TERMINAL_STATUSES:
            flag("open but board terminal")
        if kind == "PullRequest" and state == "MERGED" and status != "Done":
            flag("merged PR not Done")
        if (
            kind == "Issue"
            and str(d.get("stateReason", "")).upper() == "NOT_PLANNED"
            and status == "Done"
        ):
            flag("not-planned issue marked Done")
        if status == "(none)":
            flag("no status")
        if len(status_labels) > 1:
            flag("multiple status labels")
        if status_labels and status not in status_labels:
            flag("label/board status mismatch")
        if not status_labels:
            flag("no status label")
        if status != exp:
            flag("board status mismatch")

    # Check for missing items from repo that should be on this board
    # For scoped boards (e.g. DarkFactory #16), check items belonging to that repository
    for (r, k, n), d in live.items():
        if (r, k, n) not in board_seen:
            # Check if this repo belongs to the board
            # If board is 16 (DarkFactory), only DarkFactory items
            repo_name = r.split("/")[-1]
            # If all items on board belong to one repo, only check that repo for missing items
            if len(repos) == 1 or repo_name.lower() in ("darkfactory",):
                ref = f"{repo_name}#{n}"
                problems["missing from board"] += 1
                if len(examples["missing from board"]) < 6:
                    examples["missing from board"].append(
                        f"{ref} [absent] {d.get('title', '')[:50]}"
                    )

    result = {
        "items": len(items),
        "by_status": by_status,
        "problems": problems,
    }
    print(json.dumps(result, indent=1, default=dict))
    for key, rows in examples.items():
        print(f"\n{key}:")
        for r in rows:
            print("  ", r)

    return {"items": len(items), "by_status": by_status, "problems": problems, "examples": examples}


if __name__ == "__main__":
    owner_arg = sys.argv[1] if len(sys.argv) > 1 else project_automation.PROJECT_OWNER
    number_arg = sys.argv[2] if len(sys.argv) > 2 else "16"
    audit_board(owner_arg, number_arg)
