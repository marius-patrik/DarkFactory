"""Applies every GitHub setting that otherwise only exists in the web UI.

Repository configuration that lives outside the git tree — labels, merge behaviour, Actions
permissions, branch protection, the project board and its Status options, topics, and Pages — is
invisible to review and silently drifts. This script is the executable record of that configuration
and is safe to re-run: every operation is idempotent.

Usage::

    python .github/scripts/repo_settings.py --apply
    python .github/scripts/repo_settings.py --plan          # print, change nothing
    python .github/scripts/repo_settings.py --apply --skip-protection

Requires ``gh`` authenticated with ``repo``, ``workflow``, ``project``, and ``admin:repo_hook``
scopes. Branch protection needs admin on the repository.
"""

import argparse
import json
import subprocess
import sys
from typing import Any, Dict, List, Optional, Sequence

OWNER = "marius-patrik"
REPO = "DarkFactory"
SLUG = f"{OWNER}/{REPO}"
PROJECT_TITLE = "DarkFactory"

DESCRIPTION = (
    "Turn-key template repository for autonomous, governed software engineering pipelines "
    "('Dark Factory'). Multi-harness agent runner, branch protection, strict verification, "
    "and project board delivery."
)

HOMEPAGE = f"https://{OWNER}.github.io/{REPO}/"

TOPICS: List[str] = [
    "agentic-coding",
    "agentic-development",
    "ai-agents",
    "autonomous-agents",
    "automation",
    "dark-factory",
    "developer-tools",
    "orchestration",
    "template",
    "template-repository",
    "workspace",
]

#: Project board Status options, in column order. Mirrors AGENTS.md rule 9 and
#: ``project_automation.STATUS_NAMES``; the test suite asserts the two stay in sync.
STATUS_OPTIONS: List[str] = [
    "Backlog",
    "ToDo",
    "In Progress",
    "Blocked",
    "Done",
    "Superseded",
    "Dropped",
]

#: (name, colour, description). Colours are hex without the leading '#'.
LABELS: List[Sequence[str]] = [
    # Lifecycle status - managed by automation, exactly one per item.
    ("Backlog", "6f42c1", "Staged for future consideration"),
    ("ToDo", "0e8a16", "Approved and ready to be worked on"),
    ("In Progress", "fbca04", "Work is actively in progress"),
    ("Blocked", "d93f0b", "Blocked by dependencies, externals, or agent quota"),
    ("Done", "8250df", "Completed and verified"),
    ("Superseded", "d4c5f9", "Outranked or superseded by a newer request or plan"),
    ("Dropped", "e11d48", "Closed without implementation or abandoned"),
    # Pipeline roles.
    ("Request", "1d76db", "User request issue - carries the verbatim wording"),
    ("Plan", "006b75", "Implementation plan child issue"),
    ("epic", "b60205", "Container issue tracking a whole area of work"),
    ("decision", "5319e7", "Architecture decision requiring an ADR"),
    # Conventional Commit types.
    ("feat", "0e8a16", "New feature"),
    ("bug", "d73a4a", "Something isn't working"),
    ("refactor", "fbca04", "Code refactoring without behavioral change"),
    ("docs", "0075ca", "Documentation updates and docstrings"),
    ("test", "c5def5", "Test suite additions or fixes"),
    ("chore", "bfdadc", "Maintenance or tooling changes"),
    ("ci", "1d76db", "CI/CD workflows and automation"),
    # Areas - mirror AGENTS.md rule 15 and agent_runner.AREA_LABELS.
    ("area:core", "5319e7", "Microkernel, IPC/substrate bus, daemon, configuration"),
    ("area:ui", "1f883d", "DOM renderer, layout, theming, brand presets, settings surfaces"),
    ("area:term", "0052cc", "Terminal cell-grid renderer, ANSI pipeline, PTY integration"),
    ("area:agents", "a2eeef", "Harness orchestration, providers, personas, approvals"),
    ("area:browser", "f9d0c4", "Embedded browser engine, CDP bridge, render modes"),
    ("area:data", "c2e0c6", "Schema, persistence, migrations, sync, local-first storage"),
    ("area:ext", "e99695", "Extension host, plugin API, compatibility shims"),
    ("area:ci", "006b75", "GitHub Actions, containers, runner scripts, repo automation"),
    ("area:docs", "0075ca", "Documentation, MkDocs configuration, architecture notes"),
    # General triage.
    ("good first issue", "7057ff", "Good for newcomers"),
    ("help wanted", "008672", "Extra attention is needed"),
    ("question", "d876e3", "Further information is requested"),
    ("duplicate", "cfd3d7", "This issue or pull request already exists"),
    ("accessibility", "f143ab", "Barrier affecting people with disabilities"),
]

#: Status check contexts required on `main`. Only jobs that always report a conclusion belong here;
#: a job that can be skipped will block every merge forever.
REQUIRED_CHECKS: List[str] = [
    "pipeline (3.10)",
    "pipeline (3.11)",
    "pipeline (3.12)",
    "pipeline (3.13)",
    "rust",
    "web",
    "docs",
    "verify-bound-issue",
]


class Runner:
    """Executes ``gh`` commands, or prints them in plan mode."""

    def __init__(self, apply: bool):
        """Initializes the runner.

        Args:
            apply: Execute commands when ``True``; print them when ``False``.
        """
        self.apply = apply
        self.failures: List[str] = []

    def gh(self, args: List[str], *, allow_fail: bool = False) -> Optional[str]:
        """Runs a ``gh`` command.

        Args:
            args: Arguments following the ``gh`` executable.
            allow_fail: Treat a non-zero exit as informational rather than a failure.

        Returns:
            Stripped stdout, or ``None`` in plan mode or on a tolerated failure.
        """
        printable = " ".join(args)
        if not self.apply:
            print(f"  would run: gh {printable}")
            return None
        result = subprocess.run(["gh"] + args, capture_output=True, text=True)
        if result.returncode != 0:
            message = (result.stderr or result.stdout).strip().splitlines()
            detail = message[0] if message else "unknown error"
            if allow_fail:
                print(f"  note: gh {printable} -> {detail}")
                return None
            print(f"  FAILED: gh {printable} -> {detail}", file=sys.stderr)
            self.failures.append(printable)
            return None
        return result.stdout.strip()

    def api(
        self, method: str, path: str, fields: Optional[Dict[str, Any]] = None, **kwargs: Any
    ) -> Optional[str]:
        """Calls the GitHub REST API with a JSON body.

        Args:
            method: HTTP method.
            path: API path.
            fields: JSON body, sent through ``--input -`` when present.
            **kwargs: Forwarded to :meth:`gh`.

        Returns:
            Stripped stdout, or ``None``.
        """
        args = ["api", "-X", method, path]
        if fields is None:
            return self.gh(args, **kwargs)

        printable = f"{method} {path} {json.dumps(fields)}"
        if not self.apply:
            print(f"  would call: {printable}")
            return None
        result = subprocess.run(
            ["gh"] + args + ["--input", "-"],
            input=json.dumps(fields),
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout).strip().splitlines()
            first = detail[0] if detail else "unknown error"
            if kwargs.get("allow_fail"):
                print(f"  note: {printable} -> {first}")
                return None
            print(f"  FAILED: {printable} -> {first}", file=sys.stderr)
            self.failures.append(printable)
            return None
        return result.stdout.strip()


def apply_repository_settings(run: Runner) -> None:
    """Sets description, homepage, features, and merge behaviour.

    Args:
        run: Command runner.
    """
    print("\n== Repository settings ==")
    run.api(
        "PATCH",
        f"repos/{SLUG}",
        {
            "description": DESCRIPTION,
            "homepage": HOMEPAGE,
            "has_issues": True,
            "has_projects": True,
            "has_wiki": False,
            "allow_squash_merge": True,
            "allow_merge_commit": True,
            "allow_rebase_merge": True,
            "allow_auto_merge": True,
            "delete_branch_on_merge": True,
            "allow_update_branch": True,
            "web_commit_signoff_required": False,
        },
    )
    run.api("PUT", f"repos/{SLUG}/topics", {"names": TOPICS})


def apply_actions_permissions(run: Runner) -> None:
    """Grants Actions the write access and PR-approval rights the pipeline depends on.

    Without ``can_approve_pull_request_reviews`` the bot cannot submit the proxy approval that
    unblocks auto-merge, and every PR stalls at ``REVIEW_REQUIRED``.

    Args:
        run: Command runner.
    """
    print("\n== Actions permissions ==")
    run.api("PUT", f"repos/{SLUG}/actions/permissions", {"enabled": True, "allowed_actions": "all"})
    run.api(
        "PUT",
        f"repos/{SLUG}/actions/permissions/workflow",
        {
            "default_workflow_permissions": "write",
            "can_approve_pull_request_reviews": True,
        },
    )


def apply_labels(run: Runner) -> None:
    """Creates or updates every label in the taxonomy.

    Args:
        run: Command runner.
    """
    print("\n== Labels ==")
    existing: set = set()
    listing = run.gh(["label", "list", "--repo", SLUG, "--limit", "200", "--json", "name"])
    if listing:
        existing = {entry["name"] for entry in json.loads(listing)}
    elif run.apply:
        print("  could not list labels; falling back to create-then-edit")

    for name, color, description in LABELS:
        if name in existing:
            run.gh(
                [
                    "label",
                    "edit",
                    name,
                    "--repo",
                    SLUG,
                    "--color",
                    color,
                    "--description",
                    description,
                ],
                allow_fail=True,
            )
        else:
            run.gh(
                [
                    "label",
                    "create",
                    name,
                    "--repo",
                    SLUG,
                    "--color",
                    color,
                    "--description",
                    description,
                    "--force",
                ],
                allow_fail=True,
            )
    print(f"  {len(LABELS)} labels reconciled")


def find_project_number(run: Runner) -> Optional[int]:
    """Looks up the Omnis project number for the owner.

    Args:
        run: Command runner.

    Returns:
        The project number, or ``None`` when it does not exist yet.
    """
    listing = run.gh(
        ["project", "list", "--owner", OWNER, "--limit", "100", "--format", "json"],
        allow_fail=True,
    )
    if not listing:
        return None
    for project in json.loads(listing).get("projects", []):
        if project.get("title") == PROJECT_TITLE:
            return int(project["number"])
    return None


def apply_project_board(run: Runner) -> Optional[int]:
    """Creates the project board and reconciles its Status single-select options.

    Args:
        run: Command runner.

    Returns:
        The project number, or ``None`` in plan mode.
    """
    print("\n== Project board ==")
    number = find_project_number(run)
    if number is None:
        created = run.gh(
            ["project", "create", "--owner", OWNER, "--title", PROJECT_TITLE, "--format", "json"]
        )
        if created:
            number = int(json.loads(created)["number"])
            print(f"  created project #{number}")
        elif not run.apply:
            print(f"  would create project {PROJECT_TITLE!r}")
            return None
    else:
        print(f"  project {PROJECT_TITLE!r} already exists as #{number}")

    if number is None:
        return None

    fields = run.gh(
        [
            "project",
            "field-list",
            str(number),
            "--owner",
            OWNER,
            "--format",
            "json",
            "--limit",
            "50",
        ]
    )
    if not fields:
        return number

    status = next(
        (f for f in json.loads(fields).get("fields", []) if f.get("name") == "Status"), None
    )
    if status is None:
        print("  no Status field on this project; create one in the UI first")
        return number

    have = [o["name"] for o in status.get("options", [])]
    if have == STATUS_OPTIONS:
        print(f"  Status options already correct: {have}")
        return number

    print(f"  Status options present: {have}")
    print(f"  Status options wanted:  {STATUS_OPTIONS}")
    apply_status_options(run, status["id"], have)
    return number


def apply_status_options(run: Runner, field_id: str, existing: List[str]) -> None:
    """Rewrites the Status single-select options to the canonical taxonomy.

    `gh project` cannot edit single-select options, so this is a GraphQL mutation. The mutation
    replaces the option set wholesale and matches surviving options by name, so items already sitting
    in a retained column keep their status. Options whose names are dropped lose their assignments,
    which is why the guard below refuses to run once the board carries columns outside the taxonomy.

    Args:
        run: Command runner.
        field_id: Node id of the Status field.
        existing: Option names currently on the field.
    """
    extra = [name for name in existing if name not in STATUS_OPTIONS and name != "Todo"]
    if extra:
        print(f"  REFUSING to rewrite: board has custom options that would be deleted: {extra}")
        print("  Reconcile them by hand, or add them to STATUS_OPTIONS, then re-run.")
        run.failures.append(f"status options rewrite blocked by custom columns {extra}")
        return

    options = [
        {"name": name, "color": color, "description": description}
        for name, color, description in (
            ("Backlog", "PURPLE", "Staged for future consideration"),
            ("ToDo", "GREEN", "Approved and ready to be worked on"),
            ("In Progress", "YELLOW", "Work is actively in progress"),
            ("Blocked", "ORANGE", "Blocked by dependencies, externals, or agent quota"),
            ("Done", "BLUE", "Completed and verified"),
            ("Superseded", "GRAY", "Outranked by a newer request or plan"),
            ("Dropped", "RED", "Closed without implementation or abandoned"),
        )
    ]
    assert [option["name"] for option in options] == STATUS_OPTIONS

    mutation = (
        "mutation($fieldId:ID!,$options:[ProjectV2SingleSelectFieldOptionInput!]!)"
        "{updateProjectV2Field(input:{fieldId:$fieldId,singleSelectOptions:$options})"
        "{projectV2Field{... on ProjectV2SingleSelectField{options{name}}}}}"
    )
    payload = {"query": mutation, "variables": {"fieldId": field_id, "options": options}}

    if not run.apply:
        print(f"  would set Status options to {STATUS_OPTIONS}")
        return

    result = subprocess.run(
        ["gh", "api", "graphql", "--input", "-"],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip().splitlines()
        print(
            f"  FAILED to set Status options: {detail[0] if detail else 'unknown'}", file=sys.stderr
        )
        run.failures.append("updateProjectV2Field singleSelectOptions")
        return
    applied = [
        option["name"]
        for option in json.loads(result.stdout)["data"]["updateProjectV2Field"]["projectV2Field"][
            "options"
        ]
    ]
    print(f"  Status options set to {applied}")


def apply_branch_protection(run: Runner) -> None:
    """Protects ``main`` with required checks, strict up-to-date, and one approving review.

    Args:
        run: Command runner.
    """
    print("\n== Branch protection (main) ==")
    run.api(
        "PUT",
        f"repos/{SLUG}/branches/main/protection",
        {
            "required_status_checks": {"strict": True, "contexts": REQUIRED_CHECKS},
            "enforce_admins": False,
            "required_pull_request_reviews": {
                "dismiss_stale_reviews": True,
                "require_code_owner_reviews": False,
                "require_last_push_approval": False,
                "required_approving_review_count": 1,
            },
            "restrictions": None,
            "required_linear_history": False,
            "allow_force_pushes": False,
            "allow_deletions": False,
            "block_creations": False,
            "required_conversation_resolution": True,
        },
    )


def apply_pages(run: Runner) -> None:
    """Enables GitHub Pages with the Actions build type.

    Args:
        run: Command runner.
    """
    print("\n== GitHub Pages ==")
    run.api("POST", f"repos/{SLUG}/pages", {"build_type": "workflow"}, allow_fail=True)
    run.api("PUT", f"repos/{SLUG}/pages", {"build_type": "workflow"}, allow_fail=True)


def report_required_secrets(run: Runner) -> None:
    """Prints which repository secrets the pipeline needs and which are already present.

    Secret *values* are never read, printed, or written by this script.

    Args:
        run: Command runner.
    """
    print("\n== Required secrets ==")
    required = {
        "GH_PROJECT_TOKEN": "Classic PAT with repo+project+workflow; the default GITHUB_TOKEN "
        "cannot write to user-owned Projects v2.",
        "ANTIGRAVITY_REFRESH_TOKEN": "Google OAuth refresh token for the agent CLI.",
        "ANTIGRAVITY_CLIENT_ID": "OAuth client id for the token exchange.",
        "ANTIGRAVITY_CLIENT_SECRET": "OAuth client secret for the token exchange.",
    }
    present: set = set()
    listing = run.gh(["secret", "list", "--repo", SLUG, "--json", "name"], allow_fail=True)
    if listing:
        present = {entry["name"] for entry in json.loads(listing)}

    for name, why in required.items():
        mark = "present" if name in present else "MISSING"
        print(f"  [{mark:>7}] {name} - {why}")
    if not present:
        print("  (could not read the secret list; treat every entry above as unverified)")


def main() -> None:
    """Entry point."""
    parser = argparse.ArgumentParser(description="Apply GitHub UI-only settings for Omnis")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--apply", action="store_true", help="Execute the changes")
    mode.add_argument("--plan", action="store_true", help="Print the changes without applying")
    parser.add_argument(
        "--skip-protection",
        action="store_true",
        help="Skip branch protection (useful before the first CI run has ever reported)",
    )
    args = parser.parse_args()

    run = Runner(apply=args.apply)
    print(f"Target: {SLUG}   mode: {'APPLY' if args.apply else 'PLAN'}")

    apply_repository_settings(run)
    apply_actions_permissions(run)
    apply_labels(run)
    apply_project_board(run)
    apply_pages(run)
    if not args.skip_protection:
        apply_branch_protection(run)
    else:
        print("\n== Branch protection (main) ==\n  skipped by --skip-protection")
    report_required_secrets(run)

    if run.failures:
        print(f"\n{len(run.failures)} operation(s) failed:", file=sys.stderr)
        for failure in run.failures:
            print(f"  - {failure}", file=sys.stderr)
        sys.exit(1)
    print("\nDone.")


if __name__ == "__main__":
    main()
