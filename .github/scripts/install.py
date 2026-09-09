"""Generates everything a repository needs to join the pipeline.

Installing used to mean installing the GitHub App and then writing six caller workflows and a
manifest by hand, in the right shape, pinned to the right commit. Every one of those is derivable:
the callers differ only in name and trigger, and the manifest's interesting parts - what the
repository is made of, and therefore which jobs are worth running - are exactly what
`environment.configure` already answers.

So this writes them. What cannot be derived is intent: a repository's areas describe its own
domains, so a starter set is offered and expected to be edited.

The caller files have to exist in the target repository because GitHub only runs workflow files
present on the branch an event fires on; there is no way to drive a repository's pipeline entirely
from elsewhere. Generating them is the closest thing to installing nothing.
"""

import json
import os
from typing import Dict, List, Optional

import environment

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
    "deploy-docs": {
        "name": "Deploy Documentation",
        "on": "push:\n    branches: [{branch}]\n  workflow_dispatch:",
        "permissions": "contents: write\n  deployments: write",
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
    "auto-format": {
        "name": "Auto Format",
        "on": 'push:\n    branches: ["**"]\n  workflow_dispatch:',
        "permissions": "contents: write",
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
    "preview-docs": {
        "name": "Preview Documentation",
        "on": "pull_request:\n    types: [opened, synchronize, reopened, closed]",
        "permissions": "contents: write\n  deployments: write\n  pull-requests: write",
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
        "description": "Documentation site, theme, architecture notes",
        "keywords": ["doc", "docs", "documentation", "readme", "site"],
    },
}


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
        "auto-format",
        # The reporting half.
        "ci",
        "deploy-docs",
        "preview-docs",
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
    """Renders a starter `darkfactory.json` from what the repository is made of.

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
        "upstream": {
            "$comment": "`ref` is the pin: bump it to adopt a pipeline update.",
            "repo": pipeline_repo,
            "ref": ref,
        },
        "board": {
            "global_title": "Global",
            "link_boards": ["Global"],
        },
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
    return json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"


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
    installed = relevant_workflows(root)
    files = {
        f".github/workflows/{name}.yml": render_caller(name, pipeline_repo, ref, branch, installed)
        for name in installed
    }
    files[".github/darkfactory.json"] = render_manifest(
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

### 1. Areas — the one thing that cannot be derived

`.github/darkfactory.json` carries a starter set. Areas drive **labels, Conventional Commit scopes
and agent routing**, so they are worth getting right. Replace them with this repository's own
domains, then re-run the install workflow to reconcile the labels.

### 2. Credentials

| Secret | Needed for | Without it |
| :--- | :--- | :--- |
| `GH_PROJECT_TOKEN` | Project board writes | Board automation fails; `GITHUB_TOKEN` cannot write user-owned Projects v2 |
| `ANTHROPIC_API_KEY` / `CLAUDE_CODE_OAUTH_TOKEN` / others | The agent runner | The agent stays off |

Set `AGENT_ENABLED` to `true` only once you want the runner working.

### 3. Documentation

If this repository should publish a site, enable Pages on the `gh-pages` branch and allow the
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
this repository pins a commit of it in `.github/darkfactory.json`, and bumping that pin is how
{name} adopts an update.
"""


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
    written = write(
        plan(
            owner=owner,
            repo=repo,
            ref=os.environ.get("PIPELINE_REF", ""),
            root=root,
            branch=os.environ.get("TARGET_BRANCH", "main"),
            description=os.environ.get("TARGET_DESCRIPTION", ""),
            pipeline_repo=os.environ.get("PIPELINE_REPO", "marius-patrik/DarkFactory"),
        ),
        root,
    )
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as handle:
            handle.write(f"written={'true' if written else 'false'}\n")


if __name__ == "__main__":
    main()
