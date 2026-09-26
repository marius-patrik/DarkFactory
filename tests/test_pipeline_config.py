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
    "ci.yml",
    "deploy-docs.yml",
    "open-pr.yml",
    "pr-approval-automerge.yml",
    "project-automation.yml",
    "report-failure.yml",
    "update-submodules.yml",
    "install.yml",
    "verify-pr-issue.yml",
    "quota-resume.yml",
]

EXPECTED_SCRIPTS = [
    "agent_runner.py",
    "handle_pr_approval.py",
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


def test_ci_quality_matrix_is_detector_driven():
    """Language/package quality comes from repository evidence and capability actions."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    assert "Resolve detected quality matrix" in content
    assert "fromJSON(needs.detect.outputs.matrix)" in content
    assert "Run detected quality action" in content
    assert "hashFiles('Cargo.toml')" not in content
    assert "\n  rust:" not in content
    assert "\n  harness:" not in content


def test_ci_has_one_aggregate_quality_context():
    """Branch protection consumes one stable quality result over the detected matrix."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    assert re.search(r"^  quality:$", content, re.MULTILINE)
    assert re.search(r"^    name: quality$", content, re.MULTILINE)
    assert "needs: [detect, quality-run, docs-check]" in content


def test_python_actions_and_docs_have_separate_final_owners():
    """Capability actions execute in the matrix while the combined docs block uses the native compiler."""
    ci = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    assert "pytest -v tests" not in ci
    assert "DF_ACTION_COMMAND" in ci
    assert "repo.dfconfig" in ci
    assert 'bun "$ROOT/scripts/build-docs.ts"' in ci


def test_required_checks_match_final_stable_contexts():
    """Deletion-bound settings metadata mirrors the TypeScript required-check contract."""
    import repo_settings

    assert repo_settings.REQUIRED_CHECKS == ["quality", "verify-bound-issue"]
    ci = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    verify = _read(os.path.join(WORKFLOW_DIR, "verify-pr-issue.yml"))
    assert re.search(r"^    name: quality$", ci, re.MULTILINE)
    assert re.search(r"^  verify-bound-issue:$", verify, re.MULTILINE)


def test_verify_bound_issue_job_name_is_stable():
    """The required check name must match the job id in `verify-pr-issue.yml`."""
    content = _read(os.path.join(WORKFLOW_DIR, "verify-pr-issue.yml"))
    assert re.search(r"^  verify-bound-issue:$", content, re.MULTILINE)


def test_agent_workflow_never_leaks_secrets_into_the_log():
    """Secrets are passed as container env, never echoed."""
    content = _read(os.path.join(WORKFLOW_DIR, "agent.yml"))
    for secret in (
        "GEMINI_API_KEY",
        "DF_ACCOUNT_OPENAI_CODEX",
        "DF_ACCOUNT_GROK_SUB",
        "OPENROUTER_API_KEY",
        "GROQ_API_KEY",
    ):
        assert f"-e {secret} \\" in content or f"-e {secret}\n" in content
        assert f"echo ${{{{ secrets.{secret}" not in content
    for old_secret in ("CODEX_AUTH_JSON", "GROK_AUTH_JSON"):
        assert old_secret not in content


def test_agent_workflow_forwards_the_new_secrets_without_interpolation():
    """The df setup's secrets reach the container through step env and `-e NAME`.

    A secret pasted into a `run:` script is shell text: a login file's JSON loses its quotes on
    the way in, and a `$(...)` inside any value would execute. The generic interpolation test
    below guards every workflow; this one pins the df secret list itself.
    """
    import agent_runner

    content = _read(os.path.join(WORKFLOW_DIR, "agent.yml"))
    for secret in agent_runner.df_setup_secret_names():
        assert f"{secret}: ${{{{ secrets.{secret} }}}}" in content
        assert f"-e {secret}" in content


def test_agent_workflow_cannot_reenable_the_removed_harnesses():
    """The chain overrides are not forwarded, so no variable can bring a removed CLI back."""
    content = _read(os.path.join(WORKFLOW_DIR, "agent.yml"))
    for reference in (
        "vars.AGENT_HARNESS_CHAIN",
        "vars.AGENT_HARNESS_CONFIG",
        "-e AGENT_HARNESS_CHAIN",
        "-e AGENT_HARNESS_CONFIG",
    ):
        assert reference not in content, f"{reference} would re-enable the removed CLIs"


def test_no_script_interpolates_a_secret():
    """A secret pasted into a `run:` script is shell text: JSON loses its quotes, `$(...)` runs.

    Login files (`CODEX_AUTH_JSON`) are multi-line JSON, and the dispatch step used to paste them as
    `-e NAME="${{ secrets.NAME }}"`, so the container received a file with every quote stripped.
    Values go through the step's `env:` and reach docker as `-e NAME`.
    """
    yaml = pytest.importorskip("yaml")
    offenders = []
    for name in sorted(os.listdir(WORKFLOW_DIR)):
        if not name.endswith(".yml"):
            continue
        with open(os.path.join(WORKFLOW_DIR, name), encoding="utf-8") as handle:
            document = yaml.safe_load(handle)
        for job_id, job in (document.get("jobs") or {}).items():
            for step in job.get("steps") or []:
                if re.search(r"\$\{\{[^}]*\bsecrets\.", step.get("run") or ""):
                    offenders.append(f"{name}:{job_id}:{step.get('name')}")
    assert not offenders, f"secrets interpolated into run scripts: {offenders}"


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
    for name in ("request.yml", "epic.yml", "decision.yml", "config.yml", "configure.yml"):
        assert os.path.isfile(os.path.join(template_dir, name)), f"{name} must exist"


def test_no_step_condition_reads_the_secrets_context():
    """The secrets context is not available in a step-level `if`.

    A workflow that tries fails at startup with no jobs, no steps and no readable error - the run
    is even listed by file path rather than by name, because the name could not be parsed. That is
    expensive to diagnose from the outside, so it is caught here instead.
    """
    yaml = pytest.importorskip("yaml")
    for name in sorted(os.listdir(WORKFLOW_DIR)):
        if not name.endswith(".yml"):
            continue
        with open(os.path.join(WORKFLOW_DIR, name), encoding="utf-8") as handle:
            document = yaml.safe_load(handle)
        for job_name, job in (document.get("jobs") or {}).items():
            for step in job.get("steps", []) or []:
                condition = str(step.get("if", ""))
                assert "secrets." not in condition, (
                    f"{name}:{job_name} reads the secrets context in a step condition; "
                    f"hoist it to a job-level env instead"
                )


def test_issue_templates_point_at_this_repository():
    """A template linking elsewhere sends contributors to another project's rules.

    The chooser's contact links pointed at omnis for long enough that every reader of this
    repository's issue chooser was handed omnis's architecture, roadmap and contribution rules.
    """
    import manifest

    loaded = manifest.load(REPO_ROOT)
    slug = f"{loaded.owner}/{loaded.repo}"
    for name in sorted(os.listdir(os.path.join(REPO_ROOT, ".github", "ISSUE_TEMPLATE"))):
        if not name.endswith(".yml"):
            continue
        content = _read(os.path.join(REPO_ROOT, ".github", "ISSUE_TEMPLATE", name))
        for match in re.finditer(r"https://github\.com/(?P<slug>[^/\s]+/[^/\s]+)", content):
            assert (
                match.group("slug") == slug
            ), f"{name} links to {match.group('slug')}, but this is {slug}"


def test_the_configuration_template_carries_the_install_marker():
    """The install workflow finds the issue by marker, so a reinstall files no duplicate."""
    import install

    content = _read(os.path.join(REPO_ROOT, ".github", "ISSUE_TEMPLATE", "configure.yml"))
    assert install.CONFIG_MARKER in content


def test_request_template_requires_verbatim_wording():
    """DF-RULE-012 (`.agents/notes/rules/012-request-capture-and-planning.md`) depends on the template asking for the unedited request."""
    content = _read(os.path.join(REPO_ROOT, ".github", "ISSUE_TEMPLATE", "request.yml"))
    assert "Verbatim User Request" in content
    assert 'labels: ["Request"]' in content


def _declared_areas() -> Dict[str, str]:
    """Reads the area taxonomy from the repository manifest.

    Returns:
        Mapping of bare area name to description, in declaration order.
    """
    import manifest

    return manifest.load(REPO_ROOT).areas


@pytest.mark.parametrize(
    "path, pattern",
    [
        (
            os.path.join(".github", "ISSUE_TEMPLATE", "request.yml"),
            r'^\s+- "(?P<name>[a-z]+) - (?P<description>.+) \(area:(?P=name)\)"$',
        ),
    ],
)
def test_area_lists_match_the_manifest(path, pattern):
    """The hand-written issue taxonomy must agree with the one declaration of the areas."""
    declared = _declared_areas()
    content = _read(os.path.join(REPO_ROOT, path))
    found = {
        match.group("name"): match.group("description")
        for match in re.finditer(pattern, content, re.MULTILINE)
    }
    assert found, f"{path} lists no areas at all"
    assert found == declared, (
        f"{path} disagrees with the repo block in repo.dfconfig; "
        f"missing={set(declared) - set(found)} unexpected={set(found) - set(declared)}"
    )


def test_pull_request_template_uses_manifest_scopes_without_copying_them():
    """The PR template refers to the declared taxonomy instead of duplicating its area list."""
    content = _read(os.path.join(REPO_ROOT, ".github", "PULL_REQUEST_TEMPLATE.md"))
    assert "Closes #" in content
    assert "repo.dfconfig-declared scope(s)" in content
    assert "detected/capability-resolved quality actions" in content
    assert not re.search(r"^- \[ \] `area:[a-z]+`", content, re.MULTILINE)
    assert "Conventional Commit type" in content


def test_gitignore_excludes_agent_checkpoint():
    """The checkpoint file is runtime state and must never be committed."""
    import agent_runner

    content = _read(os.path.join(REPO_ROOT, ".gitignore"))
    assert agent_runner.CHECKPOINT_FILENAME in content


def test_gitignore_excludes_generated_documentation_data():
    """Generated documentation JSON is a CI output, never repository content."""
    lines = _read(os.path.join(REPO_ROOT, ".gitignore")).splitlines()
    assert ".darkfactory/generated/" in lines


def test_pages_source_matches_the_deploy_workflow():
    """The manifest and the deploy workflow must agree on the Actions publishing path."""
    import manifest as manifest_module

    payload = manifest_module.load(REPO_ROOT).pages_payload()
    workflow = _read(os.path.join(WORKFLOW_DIR, "deploy-docs.yml"))

    assert payload["build_type"] == "workflow"
    assert "upload-pages-artifact" in workflow
    assert "deploy-pages" in workflow
    assert "gh-pages" not in workflow


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


def test_ci_is_a_direct_detector_driven_workflow():
    """CI is installed directly so its protected quality context is never caller-prefixed."""
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(WORKFLOW_DIR, "ci.yml"), encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    triggers = document[True] if True in document else document["on"]
    assert "workflow_call" not in triggers
    assert "merge_group" in triggers
    assert document["jobs"]["quality"]["name"] == "quality"


def test_ci_still_runs_for_this_repository_itself():
    """A file that only ran when called would leave the upstream repository untested."""
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(WORKFLOW_DIR, "ci.yml"), encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    triggers = document[True] if True in document else document["on"]
    assert "push" in triggers and "pull_request" in triggers


def test_consumer_ci_uses_a_pinned_darkfactory_runtime_checkout():
    """Installed direct CI gets detector/runtime code from the pinned DarkFactory checkout."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    assert "path: .darkfactory-runtime" in content
    assert "Check out pinned DarkFactory runtime" in content
    assert "PYTHONPATH" not in content


def test_runtime_checkout_is_skipped_when_running_in_place():
    """DarkFactory uses its checked-out PR branch rather than recursively checking itself out."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    assert "if: github.repository != 'marius-patrik/DarkFactory'" in content


def test_workflows_separate_development_from_release_pushes():
    """Quality runs on develop; production release/deploy runs on main."""
    import manifest as manifest_module

    manifest = manifest_module.load(REPO_ROOT)
    assert manifest.default_branch == "main"
    assert manifest.development_branch == "develop"

    for name in ("ci.yml", "project-automation.yml"):
        content = _read(os.path.join(WORKFLOW_DIR, name))
        assert "develop" in content, f"{name} must follow the development branch"

    for name in ("deploy-docs.yml", "release.yml"):
        content = _read(os.path.join(WORKFLOW_DIR, name))
        assert "[main]" in content, f"{name} must follow the stable release branch"


def test_branch_protection_models_both_branch_roles():
    """The release lane and integration lane have different protection contracts."""
    content = _read(os.path.join(SCRIPT_DIR, "repo_settings.py"))
    assert "MANIFEST.default_branch" in content
    assert "MANIFEST.development_branch" in content
    assert '"main-source"' in content


def test_main_source_gate_requires_develop_from_the_same_repository():
    """A PR to main is a release promotion, not a general contribution path."""
    content = _read(os.path.join(WORKFLOW_DIR, "branch-policy.yml"))
    assert "branches: [main]" in content
    assert "HEAD_BRANCH: ${{ github.event.pull_request.head.ref }}" in content
    assert 'test "$HEAD_BRANCH" = "develop"' in content
    assert 'test "$HEAD_REPOSITORY" = "$GITHUB_REPOSITORY"' in content


def test_repository_settings_fall_back_from_opaque_gh_api_failures():
    """Administration writes retry through raw REST if GitHub CLI loses the response body."""
    content = _read(os.path.join(SCRIPT_DIR, "repo_settings.py"))
    assert '"unexpected end of JSON input"' in content
    assert '"curl"' in content
    assert '"--fail-with-body"' in content
    assert '"X-GitHub-Api-Version: 2026-03-10"' in content


def test_the_docs_job_uses_the_native_docs_contract():
    """The direct docs-check job detects the combined docs block and runs the first-party compiler."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    docs_job = content[
        content.index("  docs-check:") : content.index("  quality:", content.index("  docs-check:"))
    ]
    assert "repo.dfconfig" in docs_job
    assert "config.dfconfig" in docs_job
    assert ".dfconfig" in docs_job
    assert '"repo.df"' not in docs_job
    assert '"config.df"' not in docs_job
    assert "DF_CONFIG_DIR" in docs_job
    assert 'bun "$ROOT/scripts/build-docs.ts"' in docs_job
    assert "packages/docs" not in docs_job
    assert "packages/web" not in docs_job


def test_the_docs_job_tolerates_a_repository_with_no_documentation():
    """A repository without a combined configuration reports a successful no-op docs check."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    docs_job = content[
        content.index("  docs-check:") : content.index("  quality:", content.index("  docs-check:"))
    ]
    assert "No documentation configured" in docs_job
    assert "steps.docs.outputs.present != 'true'" in docs_job


def test_repo_settings_can_configure_a_consumer_checkout():
    """Consumers carry no copy of these scripts, so the script must target another repository.

    Without this the shared settings could only ever be applied to the repository that happens to
    hold the file, which is the one repository that least needs it.
    """
    content = _read(os.path.join(SCRIPT_DIR, "repo_settings.py"))
    assert "DARKFACTORY_REPO_ROOT" in content
    assert "manifest_module.load(REPO_ROOT)" in content


def test_the_deploy_workflow_uses_the_native_docs_compiler():
    """Deploy consumes the combined docs block through the shared compiler and renderer."""
    content = _read(os.path.join(WORKFLOW_DIR, "deploy-docs.yml"))
    assert "bun scripts/build-docs.ts" in content
    assert "upload-pages-artifact" in content
    assert "deploy-pages" in content


def test_the_deploy_workflow_has_no_second_paper_renderer():
    """Documentation deployment has one renderer; domain-specific artifacts belong to capabilities."""
    content = _read(os.path.join(WORKFLOW_DIR, "deploy-docs.yml"))
    assert "environment.configure" not in content
    assert "typst-community/setup-typst" not in content
    assert "texlive-latex" not in content


def test_the_deploy_workflow_is_main_actions_release():
    """The production documentation workflow is a direct main-branch deployment."""
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(WORKFLOW_DIR, "deploy-docs.yml"), encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    triggers = document[True] if True in document else document["on"]
    assert "workflow_call" not in triggers
    assert triggers["push"]["branches"] == ["main"]
    assert "workflow_dispatch" in triggers


def test_native_docs_owners_are_present():
    """The current compiler, renderer and native configuration all exist."""
    assert os.path.isfile(os.path.join(REPO_ROOT, "repo.dfconfig"))
    assert not os.path.exists(os.path.join(REPO_ROOT, "repo.df"))
    assert not os.path.exists(os.path.join(REPO_ROOT, "config.dfconfig"))
    assert not os.path.exists(os.path.join(REPO_ROOT, ".dfconfig"))
    fallback = os.path.join(REPO_ROOT, ".darkfactory")
    for filename in ("repo.df", "config.df", "repo.dfconfig", "config.dfconfig", ".dfconfig"):
        assert not os.path.exists(os.path.join(fallback, filename))
    assert os.path.isfile(os.path.join(REPO_ROOT, "packages", "docs", "src", "content.ts"))
    assert os.path.isfile(os.path.join(REPO_ROOT, "packages", "web", "src", "docs.ts"))


def test_the_app_installation_is_recorded():
    """The installation id is what a token request needs, and it is not a secret."""
    import manifest as manifest_module

    app = manifest_module.load(REPO_ROOT).app
    assert app["installation_id"] == 159771550
    assert "marius-patrik/omnis" in app["installed_on"]


def test_the_agent_is_callable_and_declares_every_credential():
    """Secrets do not cross a workflow_call boundary on their own.

    A called workflow sees the caller's secrets only when they are passed, so every credential the
    runner can use has to be declared here or a consumer's agent silently loses that harness.
    """
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(WORKFLOW_DIR, "agent.yml"), encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    triggers = document[True] if True in document else document["on"]
    assert "workflow_call" in triggers

    declared = set(triggers["workflow_call"]["secrets"])
    body = _read(os.path.join(WORKFLOW_DIR, "agent.yml"))
    used = set(re.findall(r"secrets\.([A-Z0-9_]+)", body)) - {"GITHUB_TOKEN"}
    missing = used - declared
    assert not missing, f"credentials used but not declared for callers: {sorted(missing)}"


def test_every_agent_credential_is_optional():
    """A repository with three of the twelve harnesses gets a shorter chain, not a failure."""
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(WORKFLOW_DIR, "agent.yml"), encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    triggers = document[True] if True in document else document["on"]
    for name, spec in triggers["workflow_call"]["secrets"].items():
        assert spec.get("required") is False, f"{name} must be optional"


def test_the_agent_image_is_built_from_the_pipeline():
    """Consumers must run the same runner, not whatever Dockerfile they happen to carry."""
    content = _read(os.path.join(WORKFLOW_DIR, "agent.yml"))
    assert 'CONTEXT=".darkfactory-pipeline"' in content
    assert "$CONTEXT/docker/Dockerfile.agent" in content


#: Workflows that run *in* this repository rather than being called from another.
#:
#: `install.yml` reaches into a consumer to write its callers, so a consumer calling it would be
#: asking to be installed into itself. It is the one workflow that is deliberately not shared.
NOT_CALLABLE = {"install.yml", "ci.yml", "branch-policy.yml", "deploy-docs.yml", "preview-docs.yml"}


def test_every_shared_workflow_is_callable():
    """A workflow a consumer cannot call is a workflow every consumer copies."""
    yaml = pytest.importorskip("yaml")
    for name in sorted(os.listdir(WORKFLOW_DIR)):
        if not name.endswith(".yml") or name in NOT_CALLABLE:
            continue
        with open(os.path.join(WORKFLOW_DIR, name), encoding="utf-8") as handle:
            document = yaml.safe_load(handle)
        triggers = document[True] if True in document else document["on"]
        assert "workflow_call" in triggers, f"{name} cannot be shared"


def test_script_paths_resolve_against_the_pinned_pipeline():
    """A consumer carries none of these scripts, so a hardcoded path finds nothing there.

    The fallback keeps this repository working unchanged: unset, `PIPELINE_SCRIPTS` resolves to the
    local directory, which is exactly where the scripts are when the pipeline runs on itself.
    """
    import re as _re

    for name in sorted(os.listdir(WORKFLOW_DIR)):
        if not name.endswith(".yml"):
            continue
        content = _read(os.path.join(WORKFLOW_DIR, name))
        for line in content.splitlines():
            if _re.search(r"python3?\s+\.github/scripts/", line):
                raise AssertionError(
                    f"{name} invokes a script by hardcoded path, which a consumer does not have: "
                    f"{line.strip()}"
                )


def test_open_pr_forwards_its_dispatch_inputs_to_callers():
    """A called workflow receives nothing from the caller's own `inputs` context automatically.

    Every value the dispatch form collects has to be declared on `workflow_call` too, or a caller
    can invoke it but never tell it what pull request to open.
    """
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(WORKFLOW_DIR, "open-pr.yml"), encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    triggers = document[True] if True in document else document["on"]
    dispatch = set(triggers["workflow_dispatch"]["inputs"])
    called = set(triggers["workflow_call"]["inputs"])
    assert dispatch <= called, f"not forwardable to callers: {sorted(dispatch - called)}"


def test_preview_validates_without_publishing():
    """PR documentation validates locally; production Pages remains main-only."""
    content = _read(os.path.join(WORKFLOW_DIR, "preview-docs.yml"))
    assert "Validate documentation projections" in content
    assert "bun scripts/build-docs.ts" in content
    assert "deploy-pages" not in content
    assert "gh-pages" not in content
    assert "target-folder: pr-" not in content


def test_preview_uses_the_same_native_docs_compiler():
    """Preview and deploy render the same combined docs block content graph."""
    content = _read(os.path.join(WORKFLOW_DIR, "preview-docs.yml"))
    assert "bun scripts/build-docs.ts" in content
    assert "--check" in content
    assert "deploy-pages" not in content


def test_a_failed_project_lookup_never_creates_a_board():
    """A transient failure that reads as absence makes the script create a duplicate board.

    That happened: one timed-out listing during a reconcile produced a second board titled
    `Global`, which then appeared twice in two repositories' Projects tabs. Every lookup must
    distinguish "the listing says it is not there" from "the listing could not be read".
    """
    content = _read(os.path.join(SCRIPT_DIR, "repo_settings.py"))
    assert "class LookupFailed" in content
    assert content.count("except LookupFailed") >= 3, "every caller must handle it"

    import repo_settings

    class _Failing(repo_settings.Runner):
        def gh(self, args, **kwargs):
            return None

    runner = _Failing(apply=True)
    with pytest.raises(repo_settings.LookupFailed):
        repo_settings.find_project_number(runner, "Global")


def test_no_script_defaults_to_another_repository():
    """A default naming another project aims a stray run at somebody else's repository.

    Each of these only applies when `GITHUB_REPOSITORY` is unset, which never happens inside
    Actions - which is exactly why they survived. The failure would appear the first time a script
    ran outside a workflow, pointed somewhere nobody intended.
    """
    import manifest

    loaded = manifest.load(REPO_ROOT)
    slug = f"{loaded.owner}/{loaded.repo}"
    for name in sorted(os.listdir(SCRIPT_DIR)):
        if not name.endswith(".py"):
            continue
        content = _read(os.path.join(SCRIPT_DIR, name))
        for match in re.finditer(r'"(?P<slug>marius-patrik/[A-Za-z0-9_.-]+)"', content):
            found = match.group("slug")
            assert found == slug, f"{name} names {found}, but this repository is {slug}"


def test_repository_documents_name_the_native_docs_contract():
    """Normative repository text points at the current documentation owners."""
    agents = _read(os.path.join(REPO_ROOT, ".agents", "AGENTS.md"))
    prd = _read(os.path.join(REPO_ROOT, ".agents", "PRD.md"))
    assert "`docs` block" in agents
    assert "`docs` block" in prd
    assert "@darkfactory/docs" in prd
    assert "@darkfactory/web" in prd


#: Workflows that write to GitHub on the pipeline's behalf and must therefore authenticate as the
#: App. `ci`, `verify-pr-issue`, `deploy-docs`, `preview-docs` and `release` write
#: only within their own repository with `GITHUB_TOKEN`, which has its own quota and needs no App.
APP_AUTHENTICATED_WORKFLOWS = [
    "agent.yml",
    "install.yml",
    "open-pr.yml",
    "pr-approval-automerge.yml",
    "project-automation.yml",
    "report-failure.yml",
    "update-submodules.yml",
]


#: Workflows holding a line that deliberately prefers the user's token, and how many such lines.
#: An installation token cannot do these, so the exception is recorded rather than left looking like
#: an oversight - and the count is asserted, so a second one in the same file is still caught.
USER_TOKEN_EXCEPTIONS: Dict[str, int] = {}

#: There are three things an installation token cannot do - write a user-owned Projects v2 board,
#: administer a repository (`/pages`), and list secrets - and none of them is an exception to this
#: rule. Every workflow authenticates as the App and carries the user's token in a *separate*
#: variable that only those calls read, so the narrow thing stays narrow. Preferring a token and
#: carrying one for a specific purpose are different things, and only the first is a licence worth
#: policing - which is why this map is empty and should stay that way.


def _user_first_lines(name: str) -> List[str]:
    """Returns the token lines in one workflow that reach for the user's token before the App's.

    Args:
        name: Workflow file name.

    Returns:
        The offending lines, stripped.
    """
    lines = []
    for line in _read(os.path.join(WORKFLOW_DIR, name)).splitlines():
        stripped = line.strip()
        if not stripped.startswith(("GH_TOKEN:", "token:")):
            continue
        if "GH_PROJECT_TOKEN" not in stripped:
            continue
        app = stripped.find("app-token.outputs.token")
        if app == -1 or app > stripped.index("GH_PROJECT_TOKEN"):
            lines.append(stripped)
    return lines


@pytest.mark.parametrize("name", APP_AUTHENTICATED_WORKFLOWS)
def test_github_writes_prefer_the_installation_token(name: str):
    """Rate limits are per user and shared across every token a person holds.

    A workflow reaching for the maintainer's token first competes with the maintainer's own session
    for one quota, which is how a pipeline run comes to fail while the App's own limit is untouched.
    The user token stays as a fallback, because a repository without the App installed must keep
    working.

    Args:
        name: Workflow file name.
    """
    content = _read(os.path.join(WORKFLOW_DIR, name))
    assert "create-github-app-token" in content, f"{name} never mints an installation token"

    offenders = _user_first_lines(name)
    allowed = USER_TOKEN_EXCEPTIONS.get(name, 0)
    assert len(offenders) <= allowed, (
        f"{name} prefers the user token over the App in {len(offenders)} place(s), "
        f"{allowed} of which are declared exceptions: {offenders}"
    )


def test_every_declared_user_token_exception_is_a_real_one():
    """An exception nobody uses is a licence left open for the next person to take.

    Asserted both ways: every declared exception must actually appear, and no workflow outside the
    list may prefer the user's token at all.
    """
    actual = {
        name: len(_user_first_lines(name))
        for name in sorted(os.listdir(WORKFLOW_DIR))
        if _user_first_lines(name)
    }
    assert actual == USER_TOKEN_EXCEPTIONS


@pytest.mark.parametrize("name", APP_AUTHENTICATED_WORKFLOWS)
def test_app_authenticated_workflows_can_receive_the_private_key(name: str):
    """A called workflow sees none of its caller's secrets unless they are passed by name.

    Args:
        name: Workflow file name.
    """
    content = _read(os.path.join(WORKFLOW_DIR, name))
    if "workflow_call:" not in content:
        return
    assert (
        "DARKFACTORY_APP_PRIVATE_KEY"
        in content.split("workflow_call:", 1)[1].split("\npermissions:", 1)[0]
    ), f"{name} cannot be given the App key by a caller"


def test_only_board_writes_reach_for_the_user_token_alone():
    """`GH_PROJECT_TOKEN` on its own is reserved for the one thing an App cannot do.

    GitHub scopes Projects v2 permissions to organisations, so a user-owned board is unreachable
    with an installation token. Everything else has an App path and must use it.
    """
    offenders = []
    for name in sorted(os.listdir(WORKFLOW_DIR)):
        content = _read(os.path.join(WORKFLOW_DIR, name))
        for line in content.splitlines():
            stripped = line.strip()
            if not stripped.startswith(("GH_TOKEN:", "token:")):
                continue
            if "GH_PROJECT_TOKEN" in stripped and "app-token.outputs.token" not in stripped:
                offenders.append(f"{name}: {stripped}")
    assert offenders == [], "these authenticate as the user with no App path:\n" + "\n".join(
        offenders
    )


def test_the_cross_repository_workflow_scopes_its_token_to_its_target():
    """An installation token covers only the repository it was minted in unless told otherwise.

    `install.yml` is the one workflow that writes somewhere else. A token scoped to DarkFactory
    pushing to a consumer fails as `Permission to <target> denied to darkfactory-pipeline[bot]`,
    which reads like a missing installation rather than a token that was never asked to cover it.
    """
    content = _read(os.path.join(WORKFLOW_DIR, "install.yml"))
    block = content.split("create-github-app-token", 1)[1].split("- name:", 1)[0]
    assert "repositories:" in block, "install.yml must scope its token to the target repository"
    assert "owner:" in block, "scoping by repository name requires naming the owner too"


@pytest.mark.parametrize(
    "name",
    [w for w in APP_AUTHENTICATED_WORKFLOWS if w != "install.yml"],
)
def test_same_repository_workflows_do_not_narrow_their_token(name: str):
    """Naming repositories on a workflow that works in its own is a way to lock yourself out.

    Args:
        name: Workflow file name.
    """
    content = _read(os.path.join(WORKFLOW_DIR, name))
    block = content.split("create-github-app-token", 1)[1].split("- name:", 1)[0]
    assert "repositories:" not in block, f"{name} acts on its own repository and must not scope"


def test_the_installer_tells_the_settings_script_which_repository_to_configure():
    """`repo_settings.py` otherwise falls back to the directory it lives in - the pipeline.

    This is the failure with no symptom: the install reports success, having reconciled DarkFactory
    against itself while the repository being installed into is left exactly as it was. It ran that
    way for every `apply-settings` install until the logs were read closely enough to notice the
    API calls naming the wrong repository.
    """
    content = _read(os.path.join(WORKFLOW_DIR, "install.yml"))
    step = content.split("Reconcile labels, board and settings", 1)[1].split("- name:", 1)[0]
    assert "DARKFACTORY_REPO_ROOT:" in step, "the settings step must name its target"
    assert "target" in step.split("DARKFACTORY_REPO_ROOT:", 1)[1].splitlines()[0]


def test_the_settings_script_honours_that_variable():
    """The workflow and the script have to agree on the name, and only a test says so."""
    source = _read(os.path.join(SCRIPT_DIR, "repo_settings.py"))
    assert 'os.environ.get("DARKFACTORY_REPO_ROOT")' in source


class TestExistingProtectionIsKeptConsistent:
    """Installing must not switch protection on, and must not leave an existing one broken."""

    class _Runner:
        """Records what would be called, and answers the protection read."""

        def __init__(self, protection: str):
            """Args:
            protection: JSON the protection endpoint should return, or "" for unprotected.
            """
            self.protection = protection
            self.calls = []
            self.failures = []

        def gh(self, args, allow_fail=False):
            """Args:
            args: Command arguments.
            allow_fail: Ignored.

            Returns:
                The canned protection payload.
            """
            self.calls.append(("gh", tuple(args)))
            return self.protection

        def api(self, method, path, payload=None):
            """Args:
            method: HTTP method.
            path: API path.
            payload: Request body.
            """
            self.calls.append((method, path, payload))

    def test_an_unprotected_branch_is_left_unprotected(self):
        """A repository that has not asked for protection must not be given it by an install."""
        import repo_settings

        run = self._Runner("")
        repo_settings.sync_protected_checks(run)
        assert not [c for c in run.calls if c[0] in ("PUT", "PATCH")]

    def test_stale_contexts_are_replaced(self):
        """This is what blocked every merge on ChessWithQuests after a re-install."""
        import json as json_module

        import repo_settings

        stale = json_module.dumps(
            {"required_status_checks": {"contexts": ["pipeline / pipeline (3.10)"]}}
        )
        run = self._Runner(stale)
        repo_settings.sync_protected_checks(run)

        patches = [c for c in run.calls if c[0] == "PATCH"]
        assert len(patches) == 1
        assert patches[0][2]["contexts"] == repo_settings.REQUIRED_CHECKS

    def test_correct_contexts_are_left_alone(self):
        """An idempotent run must be a quiet one."""
        import json as json_module

        import repo_settings

        current = json_module.dumps(
            {"required_status_checks": {"contexts": list(repo_settings.REQUIRED_CHECKS)}}
        )
        run = self._Runner(current)
        repo_settings.sync_protected_checks(run)
        assert not [c for c in run.calls if c[0] == "PATCH"]


class TestSettingsSpendTheRightQuota:
    """Every administration call needs a person; label work does not, and it is the GraphQL half."""

    def test_administration_calls_use_the_person(self, monkeypatch):
        """`administration` is the permission the App does not hold, and this module is admin.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        import repo_settings

        monkeypatch.setenv("GH_TOKEN", "app")
        monkeypatch.setenv("GH_PROJECT_TOKEN", "person")
        for args in (
            ["project", "list"],
            ["secret", "list"],
            ["api", "-X", "POST", "repos/o/r/pages"],
            ["api", "-X", "PATCH", "repos/o/r"],
            ["api", "-X", "PUT", "repos/o/r/topics"],
            ["api", "-X", "PUT", "repos/o/r/actions/permissions"],
            ["api", "repos/o/r/branches/main/protection"],
        ):
            assert repo_settings._env_for(args)["GH_TOKEN"] == "person", args

    def test_label_work_uses_the_app(self, monkeypatch):
        """`gh label list` is a GraphQL call, and GraphQL is where a person's quota runs out.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        import repo_settings

        monkeypatch.setenv("GH_TOKEN", "app")
        monkeypatch.setenv("GH_PROJECT_TOKEN", "person")
        for args in (["label", "list"], ["label", "create", "x"], ["api", "repos/o/r/labels"]):
            assert repo_settings._env_for(args)["GH_TOKEN"] == "app", args

    def test_an_unknown_call_defaults_to_the_token_that_works(self, monkeypatch):
        """Enumerating exceptions meant every new call silently defaulted to a 403.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        import repo_settings

        monkeypatch.setenv("GH_TOKEN", "app")
        monkeypatch.setenv("GH_PROJECT_TOKEN", "person")
        assert (
            repo_settings._env_for(["api", "-X", "PUT", "repos/o/r/something-new"])["GH_TOKEN"]
            == "person"
        )

    def test_without_a_user_token_nothing_is_swapped(self, monkeypatch):
        """A repository holding only the App key must still get as far as it can.

        Args:
            monkeypatch: Pytest monkeypatch fixture.
        """
        import repo_settings

        monkeypatch.setenv("GH_TOKEN", "app")
        monkeypatch.delenv("GH_PROJECT_TOKEN", raising=False)
        assert repo_settings._env_for(["project", "list"])["GH_TOKEN"] == "app"


def test_the_settings_step_carries_both_tokens():
    """The split only works if the step is given both to choose between."""
    step = (
        _read(os.path.join(WORKFLOW_DIR, "install.yml"))
        .split("Reconcile labels, board and settings", 1)[1]
        .split("\n      - name:", 1)[0]
    )
    assert "GH_TOKEN:" in step and "GH_PROJECT_TOKEN:" in step
    assert "app-token.outputs.token" in step.split("GH_TOKEN:", 1)[1].splitlines()[0]


def test_the_installation_pull_request_binds_an_issue():
    """`verify-bound-issue` is a required check, so an unbound install can never merge.

    That is what happened to ChessWithQuests: the install pull request sat blocked on a check that
    could not pass, in the one repository whose branch was protected.
    """
    content = _read(os.path.join(WORKFLOW_DIR, "install.yml"))
    pr_step = content.split("Open a pull request on the target", 1)[1].split("\n      - name:", 1)[
        0
    ]
    assert "Closes #" in pr_step, "the installation pull request must bind its issue"
    assert "steps.install-issue.outputs.number" in pr_step


def test_the_bound_issue_is_not_the_configuration_issue():
    """The configuration issue is a standing invitation and must not be closed by installing."""
    content = _read(os.path.join(WORKFLOW_DIR, "install.yml"))
    assert "darkfactory: installation" in content
    assert "darkfactory: configuration" in content
    pr_step = content.split("Open a pull request on the target", 1)[1].split("\n      - name:", 1)[
        0
    ]
    assert "darkfactory: configuration" not in pr_step


def test_a_reinstall_updates_the_pull_request_it_finds():
    """A reinstall pushes to the same branch, so the pull request is usually already open.

    Skipping it leaves the body as it was, and the body carries the issue binding — so a pull
    request opened before that binding existed stays unmergeable forever behind a required check it
    can never satisfy. All five consumer installations were in exactly that state.
    """
    step = (
        _read(os.path.join(WORKFLOW_DIR, "install.yml"))
        .split("Open a pull request on the target", 1)[1]
        .split("\n      - name:", 1)[0]
    )
    assert "gh pr edit" in step, "an existing pull request must be updated, not skipped"
    assert "already exists" not in step, "reporting it and moving on is what left them unmergeable"


def test_no_gh_call_in_repo_settings_bypasses_the_token_chooser():
    """Reaching for subprocess directly is how a call comes to use the wrong token.

    It happened twice now — once in `project_automation`, and again here, where the board's Status
    options were written as the App and failed with `Resource not accessible by integration`. That
    reads like a missing permission rather than the wrong identity, which is what makes it expensive
    to find.
    """
    source = _read(os.path.join(SCRIPT_DIR, "repo_settings.py"))
    calls = [
        block
        for block in source.split("subprocess.run(")[1:]
        # The definition of the chooser itself is not a call site.
        if "def _env_for" not in block[:200]
    ]
    assert calls, "there are gh calls to check"
    for block in calls:
        head = block[: block.index("\n    )") if "\n    )" in block else 400]
        assert "env=_env_for(" in head, f"a gh call chooses no token: {head[:120]!r}"


def test_the_install_issue_number_is_validated_before_it_is_used():
    """An empty binding is worse than none: the failure surfaces three steps downstream.

    `gh issue create` has no `--json`; it prints the issue URL. Asking for one made the command
    fail, the fallback searched an index that had not yet seen the new issue, and the pull request
    was opened with a bare `Closes #` that `verify-bound-issue` rejected.
    """
    step = (
        _read(os.path.join(WORKFLOW_DIR, "install.yml"))
        .split("File the issue the installation pull request binds", 1)[1]
        .split("\n      - name:", 1)[0]
    )
    assert "--json number --jq .number" not in step, "gh issue create has no --json"
    assert "exit 1" in step, "an unusable number must stop the run, not reach the pull request"


def test_bot_comments_do_not_start_an_agent_container():
    """Every agent comment used to start a full run that only reached "Skipping comment ... bot".

    The job-level condition drops comments authored by a `[bot]` login before the container is
    built; issues, dispatches and human comments still run.
    """
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(WORKFLOW_DIR, "agent.yml"), encoding="utf-8") as handle:
        document = yaml.safe_load(handle)
    condition = document["jobs"]["run-agent"]["if"]
    assert "endsWith(github.event.comment.user.login, '[bot]')" in condition
    assert condition.count("!endsWith") == 1


def test_ci_docs_job_runs_the_native_bun_compiler():
    """The combined docs block is compiled by the Bun workspace in the direct docs-check job."""
    content = _read(os.path.join(WORKFLOW_DIR, "ci.yml"))
    block = content[
        content.index("  docs-check:") : content.index("  quality:", content.index("  docs-check:"))
    ]
    assert "uses: oven-sh/setup-bun@v2" in block
    assert "bun install --frozen-lockfile" in block
    assert 'bun "$ROOT/scripts/build-docs.ts"' in block
