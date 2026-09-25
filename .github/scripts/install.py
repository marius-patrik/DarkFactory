"""Generates the current DarkFactory consumer installation.

The installer writes the caller workflows and canonical root `repo.dfconfig` combined configuration required
by the shared DarkFactory pipeline. Detectable repository facts come from environment detection;
repository-specific intent such as areas remains declarative. Generated caller workflows pin the
selected DarkFactory commit.

The governed knowledge layout uses canonical .agents paths and contains only current records.
"""

import json
import os
import re
from typing import Dict, List, Optional

import environment
import manifest

PIPELINE_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIRECT_WORKFLOW_TEMPLATES = {
    "ci": os.path.join(PIPELINE_ROOT, "harness", "assets", "workflows", "ci.yml.tmpl"),
    "verify-pr-issue": os.path.join(
        PIPELINE_ROOT, "harness", "assets", "workflows", "verify-bound-issue.yml.tmpl"
    ),
}

#: Workflow file name -> (display name, `on:` block, `permissions:` block).
#:
#: The display name matters beyond cosmetics: `report-failure` watches workflows *by name*, so a
#: caller named anything else is a workflow its own failure reporter cannot see.
WORKFLOWS: Dict[str, Dict[str, str]] = {
    "ci": {
        "name": "CI",
        "on": "push:\n    branches: [{branch}]\n  pull_request:\n  workflow_dispatch:",
        "permissions": "contents: read",
    },
    "release": {
        "name": "Release",
        "on": "push:\n    branches: [{branch}]\n  workflow_dispatch:",
        "permissions": "contents: write",
    },
    "project-automation": {
        "name": "Project Board Automation",
        "on": (
            "issues:\n    types: [opened, labeled, unlabeled, closed, reopened]\n"
            "  pull_request:\n    types: [opened, edited, closed, ready_for_review, reopened]\n"
            "  workflow_dispatch:"
        ),
        "permissions": (
            "contents: read\n  issues: write\n  pull-requests: write\n"
            "  repository-projects: write"
        ),
    },
    "report-failure": {
        "name": "Report Pipeline Failure",
        # The watch list is filled in by `render_caller` from the workflows actually installed.
        # `workflow_run` matches by *display name* and a name that matches nothing is not an error,
        # it simply never fires - which is how agent failures went unreported for as long as the
        # pipeline watched a workflow called "Agent" that had been renamed "Autonomous Agent".
        "on": "workflow_run:\n    workflows: [{watched}]\n    types: [completed]",
        "permissions": "contents: read\n  issues: write",
    },
    "update-submodules": {
        "name": "Update Submodules",
        "on": 'schedule:\n    - cron: "17 4 * * *"\n  workflow_dispatch:',
        "permissions": "contents: write\n  pull-requests: write",
    },
    "agent": {
        "name": "Autonomous Agent",
        "on": (
            "issues:\n    types: [opened]\n"
            "  issue_comment:\n    types: [created]\n"
            "  pull_request_review_comment:\n    types: [created]\n"
            "  workflow_dispatch:"
        ),
        "permissions": (
            "contents: write\n  issues: write\n  pull-requests: write\n"
            "  repository-projects: write\n  actions: write"
        ),
        # `AGENT_ENABLED` is a repository variable rather than a manifest key: it is a switch a
        # person flips to stop the agent, and a switch that needs a commit is not a switch.
        "with": {"agent-enabled": "${{ vars.AGENT_ENABLED }}"},
    },
    "verify-pr-issue": {
        "name": "Verify Bound Issue",
        "on": "pull_request:\n    types: [opened, edited, synchronize, reopened]",
        "permissions": "contents: read",
    },
    "pr-approval-automerge": {
        "name": "PR Approval and Auto-Merge",
        "on": (
            "pull_request_review:\n    types: [submitted]\n"
            "  issue_comment:\n    types: [created]\n"
            "  workflow_dispatch:"
        ),
        "permissions": (
            "pull-requests: write\n  contents: write\n  issues: write\n"
            "  repository-projects: write"
        ),
    },
    "open-pr": {
        "name": "Open Pull Request",
        # Dispatch-only, and the only workflow whose inputs a caller has to declare and forward by
        # name: a called workflow receives nothing from the caller's `inputs` context on its own.
        "on": "workflow_dispatch:",
        "permissions": "contents: write\n  pull-requests: write\n  actions: write",
        "inputs": {
            "branch": ("Head branch name (e.g. feature/my-feature)", "string", True, None),
            "title": ("Pull Request title", "string", True, None),
            "body": ("Pull Request description", "string", True, None),
            "base": ("Target base branch", "string", False, "{branch}"),
            "draft": ("Create as draft PR", "boolean", False, "true"),
        },
    },
}

#: Starter areas, offered to be edited rather than presented as correct.
STARTER_AREAS: Dict[str, object] = {
    "$comment": "Replace these with this repository's own domains; they drive labels, commit "
    "scopes and agent routing, so they are worth getting right.",
    "$default": "ci",
    "ci": {
        "description": "GitHub Actions workflows, containers, runner scripts, repository automation",
        "keywords": ["ci", "action", "workflow", "pipeline", "automation"],
    },
    "docs": {
        "description": "Documentation compiler, API reference and shared web surfaces",
        "keywords": ["doc", "docs", "documentation", "tsdoc", "typedoc", "readme", "site"],
    },
}


#: Unprefixed check name -> the caller whose job reports it.
#:
#: A repository calling the pipeline as a reusable workflow sees every check prefixed with the
#: caller's job name, so `pipeline (3.12)` arrives as `ci / pipeline (3.12)`. Branch protection
#: matches contexts by string, and a protected branch waiting on a name nothing reports blocks
#: every merge - which is exactly what a *re-install* did to ChessWithQuests, whose protection still
#: named the job the previous caller happened to use.
CHECK_SOURCES: Dict[str, str] = {
    "verify-bound-issue": "verify-pr-issue",
}

#: The caller reporting every check not named above.
DEFAULT_CHECK_SOURCE = "ci"


def required_contexts(installed: List[str]) -> List[str]:
    """Returns the stable direct status-check contexts installed for branch protection."""
    contexts: List[str] = []
    if "ci" in installed:
        contexts.append("quality")
    if "verify-pr-issue" in installed:
        contexts.append("verify-bound-issue")
    return contexts


def relevant_workflows(root: str = ".") -> List[str]:
    """Chooses the workflows worth installing, from what the repository actually holds.

    Args:
        root: Repository root.

    Returns:
        Workflow file names, without the `.yml` suffix.

    """
    chosen = [
        # The governed flow. Without these an installation reports on work it cannot do: issues get
        # no interpretation, because no workflow on the default branch is listening for them.
        "agent",
        "open-pr",
        "pr-approval-automerge",
        "verify-pr-issue",
        # The reporting half.
        "ci",
        "release",
        "project-automation",
        "report-failure",
    ]
    if os.path.isfile(os.path.join(root, ".gitmodules")):
        chosen.append("update-submodules")
    return chosen


def watched_workflows(installed: List[str]) -> List[str]:
    """Returns the display names `report-failure` should watch.

    Args:
        installed: Workflow file names being installed.

    Returns:
        Display names, excluding the reporter itself - watching its own failures would loop.
    """
    return [
        WORKFLOWS[name]["name"]
        for name in installed
        if name != "report-failure" and name in WORKFLOWS
    ]


def render_dispatch_inputs(spec: Dict[str, object], branch: str) -> str:
    """Renders the `workflow_dispatch` inputs a caller has to declare.

    Args:
        spec: The workflow's entry in :data:`WORKFLOWS`.
        branch: Default branch of the consuming repository, substituted into defaults.

    Returns:
        The indented input block, or `""` when the workflow takes none.
    """
    inputs = spec.get("inputs") or {}
    if not inputs:
        return ""
    lines = ["    inputs:"]
    for name, (description, kind, required, default) in inputs.items():  # type: ignore[misc]
        lines.append(f"      {name}:")
        lines.append(f"        description: {description!r}")
        lines.append(f"        required: {str(required).lower()}")
        lines.append(f"        type: {kind}")
        if default is not None:
            rendered = default.format(branch=branch)
            # A boolean default must not be quoted; a string one must be, or a branch called
            # `true` or `2.0` would be read as something other than a string.
            lines.append(f"        default: {rendered if kind == 'boolean' else repr(rendered)}")
    return "\n".join(lines) + "\n"


def render_caller(
    workflow: str,
    pipeline_repo: str,
    ref: str,
    branch: str = "main",
    installed: Optional[List[str]] = None,
) -> str:
    """Renders one caller workflow.

    Args:
        workflow: Workflow file name without its suffix.
        pipeline_repo: `owner/name` of the repository holding the pipeline.
        ref: Commit the caller pins.
        branch: Default branch of the consuming repository.
        installed: The workflows being installed alongside this one, which is what
            `report-failure` watches. Defaults to the full set.

    Returns:
        The file contents.
    """
    direct = DIRECT_WORKFLOW_TEMPLATES.get(workflow)
    if direct:
        with open(direct, encoding="utf-8") as handle:
            return (
                handle.read()
                .replace("{{pipeline_repo}}", pipeline_repo)
                .replace("{{pipeline_ref}}", ref)
                .replace("{{default_branch}}", branch)
            )

    spec = WORKFLOWS[workflow]
    watched = watched_workflows(installed if installed is not None else relevant_workflows())
    trigger = str(spec["on"]).format(branch=branch, watched=", ".join(watched))

    # A called workflow receives nothing from the caller's `inputs` context automatically, so a
    # dispatch input has to be declared here and forwarded by name.
    forwarded = {name: f"${{{{ inputs.{name} }}}}" for name in (spec.get("inputs") or {})}
    forwarded.update(spec.get("with") or {})  # type: ignore[arg-type]
    extras = "".join(f"      {key}: {value}\n" for key, value in forwarded.items())

    return (
        f"name: {spec['name']}\n\n"
        "# A caller, not a copy: every job body comes from the pinned pipeline commit, so adopting\n"
        "# an update is a one-line change here and the diff shows exactly what moved.\n"
        f"on:\n  {trigger}\n"
        f"{render_dispatch_inputs(spec, branch)}\n"
        f"permissions:\n  {spec['permissions']}\n\n"
        f"jobs:\n  {workflow}:\n"
        f"    uses: {pipeline_repo}/.github/workflows/{workflow}.yml@{ref}\n"
        "    with:\n"
        f"{extras}"
        f"      pipeline-repo: {pipeline_repo}\n"
        f'      pipeline-ref: "{ref}"\n'
        "    secrets: inherit\n"
    )


def render_manifest(
    owner: str,
    repo: str,
    ref: str,
    root: str = ".",
    branch: str = "main",
    description: str = "",
    pipeline_repo: str = "marius-patrik/DarkFactory",
) -> str:
    """Renders the canonical root `repo.dfconfig` combined configuration.

    Args:
        owner: Repository owner login.
        repo: Repository name.
        ref: Pipeline commit to pin.
        root: Repository root, inspected to decide what to declare.
        branch: Default branch.
        description: Repository description.
        pipeline_repo: `owner/name` of the repository holding the pipeline.

    Returns:
        Pretty-printed JSON.
    """
    env = environment.configure(root)
    manifest: Dict[str, object] = {
        "$comment": "Everything the shared pipeline needs and cannot detect. The pipeline itself "
        "is identical across every repository that uses it; this file is the only thing that "
        "differs.",
        "identity": {
            "owner": owner,
            "repo": repo,
            "display_name": repo,
            "project_title": repo,
            "default_branch": branch,
            "development_branch": branch,
            "description": description,
            "topics": [],
        },
        "license": {
            "$comment": "Written from GitHub's canonical text, so it cannot drift from the "
            "wording it claims to be. NONE means deliberately not licensed for reuse, which is "
            "different from having forgotten to choose. Change it through a configuration issue.",
            "spdx": "NONE",
            "holder": "",
            "year": "",
        },
        "$comment_required_checks": "Stable direct contexts produced by the installed quality and "
        "issue-binding workflows.",
        "upstream": {
            "$comment": "`ref` is the pin: bump it to adopt a pipeline update.",
            "repo": pipeline_repo,
            "ref": ref,
        },
        "board": {
            "global_title": "Global",
            "link_boards": ["Global"],
        },
        "required_checks": required_contexts(relevant_workflows(root)),
        "areas": STARTER_AREAS,
    }

    # A repository whose only manifest carries tooling configuration has nothing to package, and
    # saying so up front is cheaper than a release that fails on every run until someone looks.
    if env.has("python") and not any(p.name for p in env.packages_for("python")):
        manifest["environment"] = {
            "$comment": "Detection found Python but no package identity, which usually means "
            "pyproject.toml carries only tooling configuration. A release here is a tag and its "
            "notes, with no assets. Delete this block if the repository really does package "
            "something.",
            "release": {"python": {"enabled": False}},
        }
    return (
        json.dumps(
            {
                "repo": manifest,
                "docs": {
                    "version": 1,
                    "site": {"name": repo, "description": description},
                    "home": ".agents/PRD.md",
                },
                "providers": {},
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )


class SelfInstall(Exception):
    """Raised when the pipeline is asked to install itself as though it were a consumer."""


def refuse_self_install(owner: str, repo: str, pipeline_repo: str) -> None:
    """Stops an installation whose target is the pipeline repository itself.

    DarkFactory is not a consumer of DarkFactory, and treating it as one does real damage in two
    specific ways. `upstream.ref` is `null` deliberately - this repository *is* the upstream, so
    pinning it to a commit of itself means nothing. And the generated `required_checks` are prefixed
    with the caller job that reports them, which is right for a repository calling the pipeline as a
    reusable workflow and wrong for the one that runs those workflows directly: it reports
    `pipeline (3.10)`, not `ci / pipeline (3.10)`.

    Applying them protected this repository's default branch against ten contexts nothing here will
    ever report, and blocked every merge until the protection was restored by hand. Refusing is
    cheap; noticing was not.

    Args:
        owner: Target repository owner.
        repo: Target repository name.
        pipeline_repo: `owner/name` of the repository holding the pipeline.

    Raises:
        SelfInstall: When the target is the pipeline itself.
    """
    if f"{owner}/{repo}".lower() == (pipeline_repo or "").lower():
        raise SelfInstall(
            f"{pipeline_repo} is the pipeline, not a consumer of it: it runs these workflows "
            "directly rather than calling them, so a generated manifest would pin it to itself "
            "and protect it against check names it never reports."
        )


def plan(
    owner: str,
    repo: str,
    ref: str,
    root: str = ".",
    branch: str = "main",
    description: str = "",
    pipeline_repo: str = "marius-patrik/DarkFactory",
) -> Dict[str, str]:
    """Builds every file an installation writes.

    Args:
        owner: Repository owner login.
        repo: Repository name.
        ref: Pipeline commit to pin.
        root: Repository root.
        branch: Default branch.
        description: Repository description.
        pipeline_repo: `owner/name` of the repository holding the pipeline.

    Returns:
        Mapping of repository-relative path to file contents.
    """
    refuse_self_install(owner, repo, pipeline_repo)
    installed = relevant_workflows(root)
    files = {
        f".github/workflows/{name}.yml": render_caller(name, pipeline_repo, ref, branch, installed)
        for name in installed
    }
    files[manifest.MANIFEST_PATH] = render_manifest(
        owner, repo, ref, root, branch, description, pipeline_repo
    )
    return files


#: Marker identifying the configuration issue, so a reinstall finds it rather than filing a second.
CONFIG_MARKER = "<!-- darkfactory: configuration -->"


def configuration_issue(repo: str, pipeline_repo: str, needs_submodules: bool = False) -> str:
    """Renders the issue that asks a person for what installation cannot decide.

    Generating the callers and the manifest gets a repository most of the way, but four things
    genuinely need a human: which domains this repository has, which credentials it may use,
    whether its documentation should be published, and when it is ready to be locked down. Leaving
    those in a README nobody opens is how a half-installed repository looks installed.

    Args:
        repo: `owner/name` of the repository being installed.
        pipeline_repo: `owner/name` of the repository holding the pipeline.
        needs_submodules: Whether the repository has submodules to keep current.

    Returns:
        Markdown body carrying the marker.
    """
    owner, _, name = repo.partition("/")
    submodule_note = (
        "\n- [ ] **Submodules** — `update-submodules` runs daily and pins each submodule to the "
        "branch it follows. Check `.gitmodules` names the branches you expect.\n"
        if needs_submodules
        else ""
    )
    return f"""{CONFIG_MARKER}

The pipeline is installed and everything derivable has been generated. Four things need you.

If this repository keeps notes - runbooks, captures, or a decision log - the canonical locations are
`.agents/rules/`, `.agents/adr/`, and `.agents/notes/`, exactly as DarkFactory does it. The
convention is what is shared; the notes themselves stay yours.

### 1. Areas — the one thing that cannot be derived

`repo.dfconfig` carries a starter set. Areas drive **labels, Conventional Commit scopes
and agent routing**, so they are worth getting right. Replace them with this repository's own
domains, then re-run the install workflow to reconcile the labels.

### 2. Credentials

| Secret | Needed for | Without it |
| :--- | :--- | :--- |
| `GH_PROJECT_TOKEN` | Project board writes | Board automation fails; `GITHUB_TOKEN` cannot write user-owned Projects v2 |
| `ANTHROPIC_API_KEY` / `CLAUDE_CODE_OAUTH_TOKEN` / others | The agent runner | The agent stays off |

Set `AGENT_ENABLED` to `true` only once you want the runner working.

### 3. Documentation

If this repository should publish a site, set GitHub Pages to the GitHub Actions source and allow the
 default branch to deploy to the `github-pages` environment. A deploy from a branch the environment
 does not permit fails **with no steps and no error text**, which is hard to read as a permissions
 problem.
{submodule_note}
### 4. Branch protection

Left off deliberately. Turn it on once CI has reported green at least once, so the required checks
are contexts that actually exist — protection requiring a check nothing reports blocks every merge
forever.

```bash
python .github/scripts/repo_settings.py --apply
```

---

Close this issue when the four are done. The pipeline is [{pipeline_repo}](https://github.com/{pipeline_repo});
this repository pins a commit of it in `repo.dfconfig`, and bumping that pin is how
{name} adopts an update.
"""


#: Matches whatever a caller's `uses:` line pins, and its `pipeline-ref:` input.
#:
#: Deliberately not restricted to a commit SHA. Some callers were generated pinning a *branch*
#: (`...ci.yml@darkfactory`), which is not a pin at all - it silently follows whatever lands there,
#: so the diff a bump is supposed to show never exists. A pattern that only matched SHAs left those
#: exactly as they were, which is the one case that most needed fixing.
PIN_PATTERN = re.compile(r"(?P<prefix>\.github/workflows/[\w.-]+\.yml@)(?P<ref>\S+)")
#: The quotes are optional because a hand-written caller need not use them, and omnis's did not -
#: so its `pipeline-ref:` kept a commit sixteen versions older than the `uses:` line above it, and
#: the pipeline's own drift test failed on the repository the repin had just "updated".
REF_INPUT_PATTERN = re.compile(
    r'(?P<prefix>pipeline-ref:\s*)(?P<quote>"?)(?P<ref>[^"\s]*)(?P=quote)'
)
DIRECT_CI_REF_PATTERN = re.compile(r'(?P<prefix>^\s*ref:\s*")[^"]+(?P<suffix>"\s*$)', re.MULTILINE)


def retarget(root: str, ref: str) -> List[str]:
    """Repoints an existing installation at a new pipeline commit.

    Installing never overwrites a file that is already there, because a repository may have
    customised a caller and a reinstall must not silently discard that. The cost of that rule was
    that a reinstall could not *update* anything either: the callers kept their old pin, so the one
    thing a consumer most needs from a reinstall - adopting a pipeline release - was the one thing
    it could not do.

    So the pin is edited rather than the file replaced. Only the commit SHA in the `uses:` line and
    the `pipeline-ref:` input change; every other line a repository has written stays exactly as it
    is.

    Args:
        root: Repository root.
        ref: Pipeline commit to point at.

    Returns:
        Paths whose pin changed.
    """
    if not ref:
        return []

    changed: List[str] = []
    directory = os.path.join(root, ".github", "workflows")
    if not os.path.isdir(directory):
        return []

    for name in sorted(os.listdir(directory)):
        if not name.endswith(".yml"):
            continue
        path = os.path.join(directory, name)
        with open(path, encoding="utf-8") as handle:
            content = handle.read()

        if name == "ci.yml" and "Check out pinned DarkFactory runtime" in content:
            updated = DIRECT_CI_REF_PATTERN.sub(
                lambda m: f'{m.group("prefix")}{ref}{m.group("suffix")}', content
            )
        else:
            updated = PIN_PATTERN.sub(lambda m: m.group("prefix") + ref, content)
        updated = REF_INPUT_PATTERN.sub(
            lambda m: f'{m.group("prefix")}{m.group("quote")}{ref}{m.group("quote")}', updated
        )
        if updated != content:
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(updated)
            print(f"  repinned .github/workflows/{name}")
            changed.append(f".github/workflows/{name}")
    return changed


def ensure_secrets_pass(root: str) -> List[str]:
    """Adds `secrets: inherit` to a caller that passes none.

    A called workflow sees none of its caller's secrets unless they are passed, and a caller written
    before that mattered passes nothing. Generated callers emit this line so reusable workflows that
    require App/user authority receive only the credentials their declared interface expects. It is
    repaired here because an existing customized caller is not overwritten wholesale during reinstall.

    Args:
        root: Repository root.

    Returns:
        Paths that gained the line.
    """
    changed: List[str] = []
    directory = os.path.join(root, ".github", "workflows")
    if not os.path.isdir(directory):
        return []

    for name in sorted(os.listdir(directory)):
        if not name.endswith(".yml"):
            continue
        path = os.path.join(directory, name)
        with open(path, encoding="utf-8") as handle:
            lines = handle.readlines()

        if not any(".github/workflows/" in line and "uses:" in line for line in lines):
            continue
        explicit = next(
            (i for i, line in enumerate(lines) if line.strip().startswith("secrets:")), None
        )
        if explicit is not None:
            if lines[explicit].strip() != "secrets:":
                continue  # `secrets: inherit`, which already passes everything.
            if any("DARKFACTORY_APP_PRIVATE_KEY" in line for line in lines):
                continue

            # An explicit list is a deliberate choice and is not widened - except for the App key,
            # which is not a preference but the difference between a workflow that can mint an
            # installation token and one that silently falls back to a person's quota. ChessWithQuests
            # listed its credentials by hand before the App existed, so its agent ran with
            # HAS_APP_KEY false and died on `gh issue edit` against an exhausted user quota.
            indent = " " * (len(lines[explicit]) - len(lines[explicit].lstrip()) + 2)
            lines.insert(
                explicit + 1,
                f"{indent}DARKFACTORY_APP_PRIVATE_KEY: "
                "${{ secrets.DARKFACTORY_APP_PRIVATE_KEY }}\n",
            )
            with open(path, "w", encoding="utf-8") as handle:
                handle.writelines(lines)
            print(f"  passed the App key in .github/workflows/{name}")
            changed.append(f".github/workflows/{name}")
            continue

        # After the last input, which every caller ends with, so the line lands inside the job.
        last_input = max(
            (i for i, line in enumerate(lines) if "pipeline-ref:" in line), default=None
        )
        if last_input is None:
            continue
        indent = " " * (len(lines[last_input]) - len(lines[last_input].lstrip()) - 2)
        lines.insert(last_input + 1, f"{indent}secrets: inherit\n")
        with open(path, "w", encoding="utf-8") as handle:
            handle.writelines(lines)
        print(f"  passed secrets in .github/workflows/{name}")
        changed.append(f".github/workflows/{name}")
    return changed


def reconcile_manifest(root: str, ref: str, planned: str) -> bool:
    """Fills in missing `repo` block keys without overwriting repository choices.

    The upstream pin is updated because moving that pin is the purpose of reinstall/update.

    Args:
        root: Repository root.
        ref: Pipeline commit to pin.
        planned: The combined configuration this installation would generate.

    Returns:
        True when the combined configuration changed.
    """
    path = manifest.resolve_manifest_path(root)
    if not os.path.isfile(path):
        return False

    with open(path, encoding="utf-8") as handle:
        current = json.load(handle)
    if not isinstance(current, dict):
        raise ValueError(f"DarkFactory configuration at {path} must contain an object.")
    current_repo = current.get("repo")
    if not isinstance(current_repo, dict):
        raise ValueError(f"DarkFactory configuration at {path} is missing the repo block.")
    planned_repo = json.loads(planned).get("repo")
    if not isinstance(planned_repo, dict):
        raise ValueError("Generated DarkFactory configuration is missing the repo block.")
    before = json.dumps(current, sort_keys=True)

    for key, value in planned_repo.items():
        if key not in current_repo:
            current_repo[key] = value

    if ref:
        current_repo.setdefault("upstream", {})["ref"] = ref

    if json.dumps(current, sort_keys=True) == before:
        return False

    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(current, indent=2, ensure_ascii=False) + "\n")
    print(f"  reconciled {os.path.relpath(path, root)}")
    return True


def write(files: Dict[str, str], root: str = ".") -> List[str]:
    """Writes the planned files, creating directories as needed.

    Existing files are left alone: a repository that has already been installed, or that has
    deliberately customised a caller, must not have that overwritten by a reinstall.

    Args:
        files: Mapping of path to contents.
        root: Repository root.

    Returns:
        Paths actually written.
    """
    written: List[str] = []
    for relative, content in sorted(files.items()):
        target = os.path.join(root, relative)
        if relative == manifest.MANIFEST_PATH:
            selected = manifest.resolve_manifest_path(root)
            if os.path.isfile(selected) and os.path.abspath(selected) != os.path.abspath(target):
                print(f"  kept {os.path.relpath(selected, root)} (selected configuration alias)")
                continue
        if os.path.exists(target):
            print(f"  kept {relative} (already present)")
            continue
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(content)
        print(f"  wrote {relative}")
        written.append(relative)
    return written


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Entry point: writes the installation into the checked-out repository."""
    root = os.environ.get("TARGET_ROOT", ".")
    owner, _, repo = os.environ.get("TARGET_REPOSITORY", "/").partition("/")
    ref = os.environ.get("PIPELINE_REF", "")
    files = plan(
        owner=owner,
        repo=repo,
        ref=ref,
        root=root,
        branch=os.environ.get("TARGET_BRANCH", "main"),
        description=os.environ.get("TARGET_DESCRIPTION", ""),
        pipeline_repo=os.environ.get("PIPELINE_REPO", "marius-patrik/DarkFactory"),
    )
    written = write(files, root)
    # A first install writes everything and has nothing to repoint; a reinstall is mostly the
    # opposite, and both go through the same path so neither is a special case.
    written += retarget(root, ref)
    written += ensure_secrets_pass(root)
    if reconcile_manifest(root, ref, files[manifest.MANIFEST_PATH]):
        written.append(os.path.relpath(manifest.resolve_manifest_path(root), root))
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write(f"written={'true' if written else 'false'}\n")


if __name__ == "__main__":
    main()
