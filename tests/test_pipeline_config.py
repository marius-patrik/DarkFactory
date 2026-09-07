"""Tests that the workflow files and repository settings script stay consistent with the rules."""

import os
import re
from typing import Dict, List

import pytest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORKFLOW_DIR = os.path.join(REPO_ROOT, ".github", "workflows")
SCRIPT_DIR = os.path.join(REPO_ROOT, ".github", "scripts")

EXPECTED_WORKFLOWS = [
    "agent.yml",
    "auto-format.yml",
    "ci.yml",
    "deploy-docs.yml",
    "open-pr.yml",
    "pr-approval-automerge.yml",
    "project-automation.yml",
    "verify-pr-issue.yml",
]

EXPECTED_SCRIPTS = [
    "agent_runner.py",
    "handle_pr_approval.py",
    "mkdocs_hooks.py",
    "open_pr.py",
    "project_automation.py",
    "repo_settings.py",
]


def _read(path: str) -> str:
    """Reads a file as text.

    Args:
        path: Absolute file path.

    Returns:
        File contents.
    """
    with open(path, encoding="utf-8") as handle:
        return handle.read()


@pytest.mark.parametrize("name", EXPECTED_WORKFLOWS)
def test_workflow_exists(name: str):
    """Every workflow the rules reference is present.

    Args:
        name: Workflow file name.
    """
    assert os.path.isfile(os.path.join(WORKFLOW_DIR, name)), f"{name} must exist"


@pytest.mark.parametrize("name", EXPECTED_SCRIPTS)
def test_script_exists(name: str):
    """Every automation script the workflows invoke is present.

    Args:
        name: Script file name.
    """
    assert os.path.isfile(os.path.join(SCRIPT_DIR, name)), f"{name} must exist"


def test_ci_language_jobs_are_guarded_not_skipped():
    """Guarded steps keep language jobs green — a skipped job can never satisfy a required check."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    assert "hashFiles('Cargo.toml')" in content
    assert "hashFiles('package.json')" in content
    # The guards must sit on steps, not on the jobs themselves.
    job_headers = re.findall(r"^  (\w[\w-]*):\n(?:    .*\n)*?    runs-on:", content, re.MULTILINE)
    assert {"pipeline", "rust", "web", "docs"} <= set(job_headers)
    for job in ("rust:", "web:"):
        block_start = content.index(f"\n  {job}")
        block = content[block_start : block_start + 200]
        assert "\n    if:" not in block, f"job {job} must not be conditionally skipped"


def test_required_checks_match_ci_job_names():
    """Branch protection may only require checks that `ci.yml` actually produces."""
    import repo_settings

    ci = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    job_names = set(re.findall(r"^    name: ([\w-]+)$", ci, re.MULTILINE))
    matrix_versions = re.findall(r'"(3\.\d+)"', ci)

    produced = set()
    for name in job_names:
        if name == "pipeline":
            produced.update(f"pipeline ({v})" for v in matrix_versions)
        else:
            produced.add(name)
    produced.add("verify-bound-issue")

    missing = set(repo_settings.REQUIRED_CHECKS) - produced
    assert not missing, f"required checks with no producing job: {sorted(missing)}"


def test_verify_bound_issue_job_name_is_stable():
    """The required check name must match the job id in `verify-pr-issue.yml`."""
    content = _read(os.path.join(WORKFLOW_DIR, "verify-pr-issue.yml"))
    assert re.search(r"^  verify-bound-issue:$", content, re.MULTILINE)


def test_agent_workflow_never_leaks_secrets_into_the_log():
    """Secrets are passed as container env, never echoed."""
    content = _read(os.path.join(WORKFLOW_DIR, "agent.yml"))
    for secret in ("ANTIGRAVITY_REFRESH_TOKEN", "ANTIGRAVITY_CLIENT_SECRET"):
        assert f"-e {secret}=" in content
        assert f"echo ${{{{ secrets.{secret}" not in content


def test_board_workflows_receive_project_coordinates():
    """Automation must know which project to write to without a hardcoded number in code."""
    for name in ("project-automation.yml", "pr-approval-automerge.yml"):
        content = _read(os.path.join(WORKFLOW_DIR, name))
        assert "PROJECT_OWNER:" in content, f"{name} must pass PROJECT_OWNER"
        assert "PROJECT_NUMBER:" in content, f"{name} must pass PROJECT_NUMBER"


def test_repo_settings_status_options_match_automation():
    """One status taxonomy, three places: prose, board settings, and the automation."""
    import project_automation
    import repo_settings

    assert repo_settings.STATUS_OPTIONS == project_automation.STATUS_NAMES


def test_repo_settings_labels_cover_every_area_and_status():
    """Every label the pipeline can apply exists in the label taxonomy."""
    import agent_runner
    import project_automation
    import repo_settings

    label_names = {name for name, _color, _desc in repo_settings.LABELS}
    for area in agent_runner.AREA_LABELS:
        assert area in label_names, f"missing area label {area}"
    for status in project_automation.STATUS_NAMES:
        assert status in label_names, f"missing status label {status}"
    for type_label in agent_runner.TYPE_LABELS:
        assert type_label in label_names, f"missing type label {type_label}"
    for role in ("Request", "Plan", "epic", "decision"):
        assert role in label_names, f"missing pipeline label {role}"


def test_repo_settings_enables_bot_pr_approval():
    """Without `can_approve_pull_request_reviews` every bot PR stalls at REVIEW_REQUIRED."""
    content = _read(os.path.join(SCRIPT_DIR, "repo_settings.py"))
    assert '"can_approve_pull_request_reviews": True' in content
    assert '"delete_branch_on_merge": True' in content
    assert '"allow_auto_merge": True' in content


def test_issue_templates_present():
    """Request, epic, and decision templates all exist, plus the chooser config."""
    template_dir = os.path.join(REPO_ROOT, ".github", "ISSUE_TEMPLATE")
    for name in ("request.yml", "epic.yml", "decision.yml", "config.yml"):
        assert os.path.isfile(os.path.join(template_dir, name)), f"{name} must exist"


def test_request_template_requires_verbatim_wording():
    """Rule 12 depends on the template asking for the unedited request."""
    content = _read(os.path.join(REPO_ROOT, ".github", "ISSUE_TEMPLATE", "request.yml"))
    assert "Verbatim User Request" in content
    assert 'labels: ["Request"]' in content


def test_pull_request_template_enforces_binding_and_matrix_rule():
    """The PR checklist carries the two rules reviewers most often forget."""
    content = _read(os.path.join(REPO_ROOT, ".github", "PULL_REQUEST_TEMPLATE.md"))
    assert "Closes #" in content
    assert "capability-matrix" in content
    assert "Conventional Commits" in content


def test_gitignore_excludes_agent_checkpoint():
    """The checkpoint file is runtime state and must never be committed."""
    import agent_runner

    content = _read(os.path.join(REPO_ROOT, ".gitignore"))
    assert agent_runner.CHECKPOINT_FILENAME in content


def test_pages_source_matches_the_deploy_workflow():
    """The manifest and the deploy workflow must agree, or the first deploy silently 404s.

    This is not hypothetical. The first push to this repository built the documentation
    successfully and then failed with `HttpError: Not Found` from `actions/deploy-pages`, because
    Pages had never been enabled. Codifying the source is only half the fix; the other half is
    that the codified source and the workflow that publishes to it cannot disagree.
    """
    import manifest as manifest_module

    payload = manifest_module.load(REPO_ROOT).pages_payload()
    workflow = _read(os.path.join(WORKFLOW_DIR, "deploy-docs.yml"))

    if payload["build_type"] == "legacy":
        branch = payload["source"]["branch"]
        assert f"branch: {branch}" in workflow, (
            f"the manifest publishes Pages from {branch!r}, but deploy-docs.yml does not "
            "push to it"
        )
        assert "upload-pages-artifact" not in workflow, (
            "the manifest declares a branch source, so the workflow must not also use the "
            "Actions build type; Pages has exactly one source"
        )
    else:
        assert "upload-pages-artifact" in workflow
        assert "deploy-pages" in workflow


def test_pages_deploy_does_not_clobber_pull_request_previews():
    """A full replace of the branch would delete every live preview on each merge."""
    workflow = _read(os.path.join(WORKFLOW_DIR, "deploy-docs.yml"))
    if "clean: true" in workflow:
        assert "clean-exclude" in workflow, "a clean deploy must exclude the preview directories"
        assert "pr-*" in workflow


def test_release_workflow_fetches_full_history():
    """Tags decide the current version, so a shallow clone computes the wrong next one."""
    content = _read(os.path.join(WORKFLOW_DIR, "release.yml"))
    assert "fetch-depth: 0" in content


def test_release_workflow_is_idempotent_on_an_existing_tag():
    """`push` and `workflow_dispatch` can both fire for one commit; the second must not fail."""
    content = _read(os.path.join(WORKFLOW_DIR, "release.yml"))
    assert "git rev-parse" in content, "the workflow must check whether the tag already exists"


def test_release_workflow_blocks_on_metadata_disagreement():
    """A tag that contradicts the artifact's own metadata is worse than no release."""
    content = _read(os.path.join(WORKFLOW_DIR, "release.yml"))
    assert "metadata_problems" in content
    assert "sys.exit(1)" in content, "a disagreement must fail the release, not just warn"


def test_release_workflow_offers_an_explicit_bump():
    """PrideVer's PROUD component cannot be derived, so a human must be able to ask for it."""
    content = _read(os.path.join(WORKFLOW_DIR, "release.yml"))
    assert "workflow_dispatch" in content
    assert "bump" in content
    assert "REQUESTED_BUMP" in content


def test_release_workflow_tolerates_a_repository_with_no_build():
    """A template repository releases a tag and notes, not a failure."""
    content = _read(os.path.join(WORKFLOW_DIR, "release.yml"))
    assert "no assets" in content or "Nothing to build" in content


def test_every_workflow_is_valid_yaml():
    """A malformed workflow is silently ignored by GitHub rather than reported."""
    yaml = pytest.importorskip("yaml")
    for name in os.listdir(WORKFLOW_DIR):
        if name.endswith((".yml", ".yaml")):
            with open(os.path.join(WORKFLOW_DIR, name), encoding="utf-8") as handle:
                yaml.safe_load(handle)


def test_ci_is_callable_as_a_reusable_workflow():
    """Consumers call this file rather than copying it, so the two cannot drift apart."""
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(WORKFLOW_DIR, "ci.yml"), encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    triggers = document[True] if True in document else document["on"]
    assert "workflow_call" in triggers
    assert "pipeline-ref" in triggers["workflow_call"]["inputs"], "the pin must be an input"


def test_ci_still_runs_for_this_repository_itself():
    """A file that only ran when called would leave the upstream repository untested."""
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(WORKFLOW_DIR, "ci.yml"), encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    triggers = document[True] if True in document else document["on"]
    assert "push" in triggers and "pull_request" in triggers


def test_a_consumer_needs_no_pipeline_scripts_of_its_own():
    """The point of the pin is that shared code lives in one repository, not three."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    assert "path: .pipeline" in content, "the pinned pipeline must be checked out separately"
    assert "PYTHONPATH" in content, "the pinned scripts must be importable"


def test_the_pipeline_checkout_is_skipped_when_running_in_place():
    """Checking this repository out into .pipeline from itself would be circular."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    assert "if: inputs.pipeline-ref != ''" in content


def test_workflows_trigger_on_the_declared_default_branch():
    """DarkFactory's default branch is named after itself, so a consumer that adds it as a
    remote gets a `darkfactory` branch with nothing to rename. Workflows that still watch
    `main` would simply never fire.
    """
    import manifest as manifest_module

    branch = manifest_module.load(REPO_ROOT).default_branch
    for name in ("ci.yml", "deploy-docs.yml", "release.yml", "project-automation.yml"):
        content = _read(os.path.join(WORKFLOW_DIR, name))
        if "branches:" not in content:
            continue
        assert (
            f'["{branch}"]' in content or f"[{branch}]" in content or "**" in content
        ), f"{name} does not trigger on {branch!r}"


def test_branch_protection_targets_the_declared_default_branch():
    """Protecting a branch that is not the default protects nothing."""
    content = _read(os.path.join(SCRIPT_DIR, "repo_settings.py"))
    assert "branches/main/protection" not in content, "the branch must not be hardcoded"
    assert "MANIFEST.default_branch" in content


def test_the_docs_job_does_not_hardcode_a_documentation_engine():
    """Consumers do not share one. This repository builds with mkdocs and omnis with properdocs,
    so a hardcoded command fails in whichever repository chose the other - which is exactly how
    the first pinned run failed, with `mkdocs: command not found`.
    """
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    docs_job = content[content.index("  docs:") :]
    assert "docs_plan" in docs_job, "the docs command must come from the caller's environment"
    assert "run: mkdocs build" not in docs_job


def test_the_docs_job_tolerates_a_repository_with_no_documentation():
    """A repository that publishes no site must not fail the check that builds one."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    docs_job = content[content.index("  docs:") :]
    assert "exit 0" in docs_job
