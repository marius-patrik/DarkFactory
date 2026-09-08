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
        "on": (
            "workflow_run:\n    workflows: [CI, Deploy Documentation, Release, Update Submodules]\n"
            "    types: [completed]"
        ),
        "permissions": "contents: read\n  issues: write",
    },
    "update-submodules": {
        "name": "Update Submodules",
        "on": 'schedule:\n    - cron: "17 4 * * *"\n  workflow_dispatch:',
        "permissions": "contents: write\n  pull-requests: write",
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
    chosen = ["ci", "deploy-docs", "release", "project-automation", "report-failure"]
    if os.path.isfile(os.path.join(root, ".gitmodules")):
        chosen.append("update-submodules")
    return chosen


def render_caller(workflow: str, pipeline_repo: str, ref: str, branch: str = "main") -> str:
    """Renders one caller workflow.

    Args:
        workflow: Workflow file name without its suffix.
        pipeline_repo: `owner/name` of the repository holding the pipeline.
        ref: Commit the caller pins.
        branch: Default branch of the consuming repository.

    Returns:
        The file contents.
    """
    spec = WORKFLOWS[workflow]
    return (
        f"name: {spec['name']}\n\n"
        "# A caller, not a copy: every job body comes from the pinned pipeline commit, so adopting\n"
        "# an update is a one-line change here and the diff shows exactly what moved.\n"
        f"on:\n  {spec['on'].format(branch=branch)}\n\n"
        f"permissions:\n  {spec['permissions']}\n\n"
        f"jobs:\n  {workflow}:\n"
        f"    uses: {pipeline_repo}/.github/workflows/{workflow}.yml@{ref}\n"
        "    with:\n"
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
    files = {
        f".github/workflows/{name}.yml": render_caller(name, pipeline_repo, ref, branch)
        for name in relevant_workflows(root)
    }
    files[".github/darkfactory.json"] = render_manifest(
        owner, repo, ref, root, branch, description, pipeline_repo
    )
    return files


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
