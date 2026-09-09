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
import os
import subprocess
import sys
from typing import Any, Dict, List, Optional, Sequence

import manifest as manifest_module

#: Everything repository-specific comes from `.github/darkfactory.json`, so this script is
#: identical in every repository that uses the pipeline.
#:
#: Consumers carry no copy of these scripts - they call the pipeline at a pinned commit - so the
#: repository being configured is not necessarily the one holding this file. `DARKFACTORY_REPO_ROOT`
#: points it at a consumer checkout; unset, it configures the repository it lives in.
REPO_ROOT = os.environ.get("DARKFACTORY_REPO_ROOT") or os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)

MANIFEST = manifest_module.load(REPO_ROOT)

OWNER = MANIFEST.owner
REPO = MANIFEST.repo
SLUG = MANIFEST.slug
PROJECT_TITLE = MANIFEST.project_title

DESCRIPTION = MANIFEST.description

HOMEPAGE = MANIFEST.homepage

TOPICS: List[str] = MANIFEST.topics

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
    ("pipeline-failure", "b91c1c", "Opened by the pipeline when one of its own workflows failed"),
    # Conventional Commit types.
    ("feat", "0e8a16", "New feature"),
    ("bug", "d73a4a", "Something isn't working"),
    ("refactor", "fbca04", "Code refactoring without behavioral change"),
    ("docs", "0075ca", "Documentation updates and docstrings"),
    ("test", "c5def5", "Test suite additions or fixes"),
    ("chore", "bfdadc", "Maintenance or tooling changes"),
    ("ci", "1d76db", "CI/CD workflows and automation"),
    # Areas come from the manifest, so the taxonomy is per-repository rather than baked in here;
    # they are appended below.
    # General triage.
    ("good first issue", "7057ff", "Good for newcomers"),
    ("help wanted", "008672", "Extra attention is needed"),
    ("question", "d876e3", "Further information is requested"),
    ("duplicate", "cfd3d7", "This issue or pull request already exists"),
    ("accessibility", "f143ab", "Barrier affecting people with disabilities"),
]

# The area taxonomy is repository-specific, so it is declared in the manifest rather than here.
# `agent_runner` and the Conventional Commit scopes read the same list, so the three cannot drift.
LABELS.extend(MANIFEST.area_labels)

#: Status check contexts required on the default branch. Declared in the manifest, because a
#: repository that calls the pipeline as a reusable workflow sees every check name prefixed with
#: its caller job's name and would otherwise require contexts nothing ever reports.
REQUIRED_CHECKS: List[str] = MANIFEST.required_checks


#: What an installation token *can* do here, rather than what it cannot.
#:
#: This module is an administration tool, and `administration` is the one permission the App does
#: not hold: repository settings, topics, Actions permissions, branch protection and `/pages` all
#: 403 as the installation. Listing secrets needs `secrets`, and Projects v2 is scoped to
#: organisations. What is left for the App is label work, which is most of the API calls by count
#: and all of the GraphQL ones - and GraphQL is where a person's quota actually runs out.
#:
#: The list is written this way round deliberately. Enumerating the exceptions meant every new call
#: silently defaulted to the App and 403'd; enumerating the capability means a new call defaults to
#: the token that works, and widening it is a decision someone has to write down.
#:
#: Granting the App `administration: write` and `secrets: read` would let this run without a
#: personal token at all, which is the version of "install is as simple as installing the App" worth
#: having. It needs a person to approve the permissions on the installation.
APP_CAPABLE_OPERATIONS = ("label", "issue")

#: API paths the App may call, matched as substrings.
APP_CAPABLE_PATHS = ("/labels", "/issues")


def _env_for(args: List[str]) -> Dict[str, str]:
    """Chooses the token one ``gh`` invocation should authenticate with.

    Args:
        args: Arguments following the ``gh`` executable.

    Returns:
        The environment to run it in.
    """
    env = dict(os.environ)
    user_token = env.get("GH_PROJECT_TOKEN", "")
    if not user_token:
        return env

    app_capable = bool(args) and args[0] in APP_CAPABLE_OPERATIONS
    app_capable = app_capable or any(path in arg for arg in args for path in APP_CAPABLE_PATHS)
    if not app_capable:
        env["GH_TOKEN"] = user_token
    return env


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
        result = subprocess.run(["gh"] + args, capture_output=True, text=True, env=_env_for(args))
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
            env=_env_for(args),
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

    def graphql(
        self, query: str, variables: Dict[str, Any], **kwargs: Any
    ) -> Optional[Dict[str, Any]]:
        """Runs a GraphQL query or mutation.

        Projects v2 has no REST surface for linking a board to a repository, so board work goes
        through GraphQL while everything else stays on REST.

        Args:
            query: The GraphQL document.
            variables: Variables to bind, all sent as strings.
            **kwargs: Forwarded to :meth:`gh`.

        Returns:
            The decoded ``data`` object, or ``None``.
        """
        args = ["api", "graphql", "-f", f"query={query}"]
        for key, value in variables.items():
            # `-f` sends a String; `-F` preserves the JSON type, which Int! arguments require.
            flag = "-f" if isinstance(value, str) else "-F"
            args += [flag, f"{key}={value}"]
        if not self.apply:
            print(f"  would call: graphql {query.split('{')[0].strip()} {variables}")
            return None
        output = self.gh(args, **kwargs)
        if not output:
            return None
        try:
            return json.loads(output).get("data")
        except ValueError:
            return None

    def graphql_project_id(self, number: int, **kwargs: Any) -> Optional[str]:
        """Resolves a project board's node id from its number.

        Args:
            number: The board number.
            **kwargs: Forwarded to :meth:`graphql`.

        Returns:
            The node id, or ``None``.
        """
        data = self.graphql(
            "query($owner:String!,$number:Int!){user(login:$owner)"
            "{projectV2(number:$number){id}}}",
            {"owner": OWNER, "number": number},
            **kwargs,
        )
        if not data:
            return None
        return (data.get("user") or {}).get("projectV2", {}).get("id")


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


class LookupFailed(Exception):
    """Raised when the board listing could not be read at all.

    Distinct from "the board does not exist": a transient API failure that reads as absence makes
    the caller create a second board with the same title. That is not hypothetical - one timeout
    during a reconcile produced a duplicate `Global` board that then appeared twice in two
    repositories' Projects tabs.
    """


def find_project_number(run: Runner, title: Optional[str] = None) -> Optional[int]:
    """Looks up a project board number by title for the owner.

    Args:
        run: Command runner.
        title: Board title to find. Defaults to this repository's own board.

    Returns:
        The project number, or ``None`` when the listing was read and the board is not in it.

    Raises:
        LookupFailed: If the listing could not be read, so absence cannot be concluded.
    """
    wanted = title or PROJECT_TITLE
    listing = run.gh(
        ["project", "list", "--owner", OWNER, "--limit", "100", "--format", "json"],
        allow_fail=True,
    )
    if not listing:
        if run.apply:
            raise LookupFailed(f"could not list projects for {OWNER}")
        return None
    for project in json.loads(listing).get("projects", []):
        if project.get("title") == wanted:
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
    try:
        number = find_project_number(run)
    except LookupFailed as error:
        # Same reasoning as the global board: a failed listing is not evidence of absence, and
        # acting on it creates a duplicate that then shows twice in the Projects tab.
        print(f"  skipped: {error}")
        return None
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
    print(f"\n== Branch protection ({MANIFEST.default_branch}) ==")
    run.api(
        "PUT",
        f"repos/{SLUG}/branches/{MANIFEST.default_branch}/protection",
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


def sync_protected_checks(run: Runner) -> None:
    """Brings an existing branch protection's required contexts up to date, and nothing else.

    Deliberately narrower than :func:`apply_branch_protection`. Installing must not switch
    protection on for a repository that has not asked for it - but where protection already exists,
    leaving it demanding contexts that no longer report is worse than not touching it at all: every
    merge blocks, and the reason is a string mismatch nothing surfaces.

    That is what a re-install did to ChessWithQuests. Its protection required
    `pipeline / pipeline (3.10)` from the caller job the previous installation happened to name,
    the new caller reports `ci / pipeline (3.10)`, and the pull request sat unmergeable with nine
    checks "expected" and nine green ones ignored.

    Args:
        run: Command runner.
    """
    print(f"\n== Required checks ({MANIFEST.default_branch}) ==")
    path = f"repos/{SLUG}/branches/{MANIFEST.default_branch}/protection"
    existing = run.gh(["api", path], allow_fail=True)
    if not existing:
        print("  not protected; leaving it that way")
        return

    try:
        current = json.loads(existing)["required_status_checks"]["contexts"]
    except (ValueError, KeyError, TypeError):
        print("  protected, but no required checks are configured; leaving them alone")
        return

    if sorted(current) == sorted(REQUIRED_CHECKS):
        print("  already correct")
        return

    print(f"  {sorted(current)} -> {sorted(REQUIRED_CHECKS)}")
    run.api(
        "PATCH",
        f"{path}/required_status_checks",
        {"strict": True, "contexts": REQUIRED_CHECKS},
    )


def apply_pages(run: Runner) -> None:
    """Enables GitHub Pages using the source declared in the manifest.

    Pages must be enabled *before* the first documentation deploy, or `actions/deploy-pages`
    fails with an opaque `HttpError: Not Found` and a 404 that names no cause. This ran after
    the first deploy once, which is why that failure is worth codifying rather than clicking.

    Args:
        run: Command runner.
    """
    print("\n== GitHub Pages ==")
    payload = MANIFEST.pages_payload()
    run.api("POST", f"repos/{SLUG}/pages", payload, allow_fail=True)
    run.api("PUT", f"repos/{SLUG}/pages", payload, allow_fail=True)


def apply_global_board(run: Runner) -> None:
    """Ensures the board that aggregates every repository exists.

    A Projects v2 board can hold issues from any repository the owner can see, so one global board
    gives a single view across the whole fleet while each repository keeps its own focused board.

    Args:
        run: Command runner.
    """
    title = MANIFEST.global_board_title
    if not title:
        return
    print("\n== Global project board ==")
    try:
        existing = find_project_number(run, title)
    except LookupFailed as error:
        # Creating on a failed lookup is how a duplicate board gets made. Skipping is always safe:
        # the next run reconciles it.
        print(f"  skipped: {error}")
        return
    if existing is not None:
        print(f"  {title!r} already exists")
        return
    run.gh(
        ["project", "create", "--owner", OWNER, "--title", title, "--format", "json"],
        allow_fail=True,
    )
    print(f"  created {title!r}")


def apply_board_links(run: Runner) -> None:
    """Links every declared project board to this repository.

    Boards are owned by the account, not by a repository, so a board only appears in a
    repository's Projects tab once it is explicitly linked. Linking every board here is what
    makes one repository the place all of them are visible from.

    Args:
        run: Command runner.
    """
    print("\n== Project board links ==")
    titles = MANIFEST.linked_boards
    if not titles:
        print("  no boards declared")
        return

    raw = run.gh(["api", f"repos/{SLUG}", "--jq", ".node_id"], allow_fail=True)
    repository_id = raw.strip() if raw else None
    if not repository_id:
        if run.apply:
            print("  could not resolve the repository node id; skipping")
        else:
            print(f"  would link {len(titles)} board(s): {', '.join(titles)}")
        return

    for title in titles:
        try:
            number = find_project_number(run, title)
        except LookupFailed as error:
            print(f"  skipped {title!r}: {error}")
            continue
        if number is None:
            print(f"  board {title!r} not found; skipping")
            continue
        project_id = run.graphql_project_id(number)
        if not project_id:
            continue
        run.graphql(
            "mutation($project:ID!,$repo:ID!){"
            "linkProjectV2ToRepository(input:{projectId:$project,repositoryId:$repo})"
            "{repository{nameWithOwner}}}",
            {"project": project_id, "repo": repository_id},
            allow_fail=True,
        )
        print(f"  linked {title!r}")


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
    parser = argparse.ArgumentParser(
        description=f"Apply GitHub UI-only settings for {MANIFEST.display_name}"
    )
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
    apply_global_board(run)
    apply_board_links(run)
    apply_pages(run)
    if not args.skip_protection:
        apply_branch_protection(run)
    else:
        print("\n== Branch protection (main) ==\n  skipped by --skip-protection")
        # Skipping protection must not mean leaving a protected branch broken by the workflows
        # this run just wrote.
        sync_protected_checks(run)
    report_required_secrets(run)

    if run.failures:
        print(f"\n{len(run.failures)} operation(s) failed:", file=sys.stderr)
        for failure in run.failures:
            print(f"  - {failure}", file=sys.stderr)
        sys.exit(1)
    print("\nDone.")


if __name__ == "__main__":
    main()
