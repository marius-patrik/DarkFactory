"""Helper script to create a pull request via GitHub Actions workflow_dispatch

Ensures all pull requests are authored by github-actions[bot] rather than local credentials,
allowing repository owners and contributors to natively review and approve them.
"""

import argparse
import json
import os
import subprocess
import sys
import time


def open_pr_as_bot(
    branch: str, title: str, body: str, base: str = "main", draft: bool = True, repo: str = None
) -> str:
    """Dispatches the open-pr.yml workflow and returns the created pull request URL."""
    cmd = [
        "gh",
        "workflow",
        "run",
        "open-pr.yml",
        "-f",
        f"branch={branch}",
        "-f",
        f"title={title}",
        "-f",
        f"body={body}",
        "-f",
        f"base={base}",
        "-f",
        f"draft={'true' if draft else 'false'}",
    ]
    if repo:
        cmd.extend(["-R", repo])

    print(f"Dispatching open-pr.yml for branch '{branch}'...")
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"Failed to dispatch workflow: {res.stderr or res.stdout}")

    print("Workflow dispatched. Waiting for pull request creation...")
    for _ in range(30):
        time.sleep(2)
        pr_res = subprocess.run(
            [
                "gh",
                "pr",
                "list",
                "--head",
                branch,
                "--base",
                base,
                "--state",
                "open",
                "--json",
                "number,url,isDraft,author",
            ],
            capture_output=True,
            text=True,
        )
        if pr_res.returncode == 0 and pr_res.stdout.strip():
            prs = json.loads(pr_res.stdout)
            if prs:
                pr = prs[0]
                print(
                    f"Found PR #{pr['number']}: {pr['url']} (author: {pr.get('author', {}).get('login')})"
                )
                return pr["url"]

    print("PR list check timed out; please verify on GitHub.")
    return ""


def _default_base() -> str:
    """Returns the branch a pull request should target by default.

    Returns:
        The declared default branch, or `main` when no manifest can be read.
    """
    try:
        import manifest

        return manifest.load(".").default_branch
    except Exception:  # noqa: BLE001 - the CLI must still parse without a manifest
        return "main"


def main():
    parser = argparse.ArgumentParser(description="Open PR authored by github-actions[bot]")
    parser.add_argument("--branch", required=True, help="Head branch name")
    parser.add_argument("--title", required=True, help="Pull request title")
    parser.add_argument("--body", required=True, help="Pull request description")
    # Defaulting to `main` is wrong wherever a repository calls its trunk something else, and the
    # manifest already records what this one calls it.
    parser.add_argument(
        "--base",
        default=_default_base(),
        help="Target base branch; defaults to the branch the manifest declares",
    )
    parser.add_argument("--ready", action="store_true", help="Open as ready instead of draft")

    args = parser.parse_args()
    open_pr_as_bot(
        branch=args.branch,
        title=args.title,
        body=args.body,
        base=args.base,
        draft=not args.ready,
    )


if __name__ == "__main__":
    main()
