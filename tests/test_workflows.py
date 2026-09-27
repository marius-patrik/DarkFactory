import os
import pathlib
import subprocess

import resolver
import yaml

CI_WORKFLOW = ".github/workflows/ci.yml"


def _workflow(path):
    with pathlib.Path(path).open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def _triggers(workflow):
    """Returns the parsed `on:` mapping; PyYAML resolves a bare `on` key to the boolean `True`."""
    return workflow[True] if True in workflow else workflow["on"]


def _steps(path, job):
    return _workflow(path)["jobs"][job]["steps"]


def _index(steps, name):
    return next(i for i, step in enumerate(steps) if step.get("name") == name)


def test_ci_quality_is_detector_driven_and_aggregated():
    workflow = _workflow(".github/workflows/ci.yml")
    jobs = workflow["jobs"]
    assert set(jobs) == {"detect", "quality-run", "docs-check", "quality"}

    detect = jobs["detect"]
    assert _index(detect["steps"], "Resolve detected quality matrix") > _index(
        detect["steps"], "Install DarkFactory runtime"
    )
    matrix = jobs["quality-run"]
    assert matrix["needs"] == "detect"
    assert "fromJSON(needs.detect.outputs.matrix)" in str(matrix["strategy"]["matrix"]["include"])
    assert _index(matrix["steps"], "Install package dependencies") < _index(
        matrix["steps"], "Run detected quality action"
    )

    docs = jobs["docs-check"]
    assert _index(docs["steps"], "Detect combined configuration docs block") < _index(
        docs["steps"], "Build native documentation"
    )

    aggregate = jobs["quality"]
    assert aggregate["name"] == "quality"
    assert set(aggregate["needs"]) == {"detect", "quality-run", "docs-check"}
    assert aggregate["if"] == "always()"


def test_ci_has_no_handwritten_language_quality_jobs():
    workflow = _workflow(".github/workflows/ci.yml")
    jobs = workflow["jobs"]
    for legacy in ("pipeline", "rust", "paper", "math", "web", "harness", "docs"):
        assert legacy not in jobs


def test_autonomous_agent_still_ignores_its_own_bot_comments():
    workflow = _workflow(".github/workflows/agent.yml")
    condition = workflow["jobs"]["run-agent"].get("if", "")
    assert "!endsWith(github.event.comment.user.login, '[bot]')" in condition


def test_autonomous_agent_does_not_mute_pipeline_failures():
    """#1193. The `pipeline-failure` label used to skip the agent on exactly the issue report-failure.yml
    files for a red build, so every failure was reported and then ignored forever. The loop is bounded by
    the effect identity the runner claims instead, so the label must not gate dispatch."""
    workflow = _workflow(".github/workflows/agent.yml")
    assert "pipeline-failure" not in workflow["jobs"]["run-agent"].get("if", "")


def test_autonomous_agent_admits_the_recurrence_report_that_resumes_a_muted_loop():
    """A red build that recurs after a repair is commented onto the still-open failure issue by the
    pipeline's own token, so a blanket bot-comment skip would swallow the only signal that resumes
    the loop."""
    workflow = _workflow(".github/workflows/agent.yml")
    condition = workflow["jobs"]["run-agent"].get("if", "")
    assert "startsWith(github.event.comment.body, 'Failed again:')" in condition


def test_agent_can_be_started_on_an_issue_that_already_exists():
    """v1 exit criterion 6. The graph's only entry edge carries the `Request` label, so a trigger of
    `issues.opened` alone makes every pre-existing issue - including every failure report - unable to
    enter the pipeline."""
    workflow = _workflow(".github/workflows/agent.yml")
    assert workflow[True]["issues"]["types"] == ["opened", "labeled"]


def test_failure_observer_only_auto_files_default_branch_incidents():
    workflow = _workflow(".github/workflows/report-failure.yml")
    triggers = workflow.get(True) or workflow["on"]
    assert triggers["workflow_run"]["types"] == ["completed"]
    assert "workflow_call" in triggers
    assert "File or resolve the failure issue" in str(workflow["jobs"]["report"]["steps"])


def test_agent_image_installs_from_the_checked_in_harness_lock():
    dockerfile = pathlib.Path("docker/Dockerfile.agent").read_text(encoding="utf-8")
    assert "COPY package.json /opt/darkfactory/" in dockerfile
    assert "COPY packages/ /opt/darkfactory/packages/" in dockerfile
    assert "COPY capabilities/ /opt/darkfactory/capabilities/" in dockerfile
    assert "bun install --frozen-lockfile --cwd /opt/darkfactory/packages/harness" in dockerfile
    assert "exec bun /opt/darkfactory/packages/harness/src/cli.ts" in dockerfile
    assert "COPY pyproject.toml requirements-dev.txt" in dockerfile
    assert "pip install --no-cache-dir -r requirements-dev.txt" in dockerfile


# --- #1147: a pull request whose base is not `develop` must still get the gate ------------------
#
# `branches` on `pull_request` filters the pull request's *base* ref. Scoping it to `develop` gave
# every stacked pull request in the delivery chain zero check-runs, and the stack branches are
# unprotected, so their mergeStateStatus read CLEAN from an evaluation that never happened.


def test_ci_runs_for_a_pull_request_against_any_base_branch():
    triggers = _triggers(_workflow(CI_WORKFLOW))["pull_request"]
    assert "branches" not in triggers, (
        "a `branches` filter on pull_request matches the base ref, so a stacked pull request gets "
        "no check-runs at all"
    )


def test_ci_reruns_when_only_the_base_branch_changed():
    triggers = _triggers(_workflow(CI_WORKFLOW))["pull_request"]
    assert "edited" in triggers["types"], (
        "a base-only change emits no synchronize event, so without `edited` the previous base's "
        "success stays displayed as current evidence"
    )
    assert {"opened", "synchronize", "reopened"} <= set(triggers["types"])


def test_ci_still_runs_on_a_protected_base_of_this_repository_itself():
    triggers = _triggers(_workflow(CI_WORKFLOW))
    assert triggers["push"]["branches"] == ["develop"]
    assert triggers["merge_group"]["branches"] == ["develop"]


def test_the_required_bound_issue_check_runs_for_a_pull_request_against_any_base_branch():
    triggers = _triggers(_workflow(".github/workflows/verify-pr-issue.yml"))["pull_request"]
    assert "branches" not in triggers
    assert "edited" in triggers["types"]


# --- #1187: the agent must be able to reach the base it is told to diff against ----------------


def test_the_agent_checkout_fetches_the_base_branch_the_runner_diffs_against():
    steps = _steps(".github/workflows/agent.yml", "run-agent")
    checkout = steps[_index(steps, "Checkout repository")]
    assert checkout["with"]["fetch-depth"] == 0, (
        "a shallow checkout has no other refs, so every `origin/<base>` the runner tries is "
        "unresolvable and the scope gate passes on an empty diff"
    )


def test_the_agent_pipeline_checkout_defaults_to_a_branch_that_exists():
    steps = _steps(".github/workflows/agent.yml", "run-agent")
    pipeline = steps[_index(steps, "Check out the pinned pipeline")]
    assert pipeline["with"]["ref"] == "${{ inputs.pipeline-ref || 'main' }}"


# --- #1225: one candidate matrix, exercised from both implementations --------------------------
#
# The one-config-per-scope rule is implemented twice: as a runtime resolver
# (`.github/scripts/resolver.py`) and as the `docs-check` gate in `ci.yml`. The gate is the one that
# decides whether a delivery run is checked, so the two must not be able to disagree about which
# trees are ambiguous. Each fixture is a candidate layout plus a `DF_CONFIG_DIR`, and both
# implementations are run against it.
#
# One known divergence is left in place and is not part of the contract: a `DF_CONFIG_DIR` that is a
# *symlink to the repository root* is two lexical scopes to the resolver and one resolved scope to
# the gate. Changing that means changing `os.path.normpath` to `os.path.realpath` in the resolver,
# which belongs with the Python removal rather than with a trigger fix.


def _docs_gate_script():
    """Returns the shell script the `docs-check` candidate detection step actually runs."""
    steps = _steps(CI_WORKFLOW, "docs-check")
    step = steps[_index(steps, "Detect combined configuration docs block")]
    script = step["run"]
    assert "${{" not in script, "the step must be runnable outside Actions to be testable"
    return script


def _gate_verdict(script, root, config_dir):
    """Runs the workflow gate against a fixture tree and returns its verdict.

    Returns:
        One of "present", "absent" or "ambiguous".
    """
    output = root.parent / f"gate-output-{root.name}"
    output.write_text("", encoding="utf-8")
    env = dict(os.environ, GITHUB_WORKSPACE=str(root), GITHUB_OUTPUT=str(output))
    env.pop("DF_CONFIG_DIR", None)
    if config_dir is not None:
        env["DF_CONFIG_DIR"] = config_dir
    completed = subprocess.run(
        ["bash", "-e", "-c", script], env=env, capture_output=True, text=True
    )
    if completed.returncode != 0:
        assert "Ambiguous DarkFactory configuration" in completed.stderr, completed.stderr
        return "ambiguous"
    if "present=true" in output.read_text(encoding="utf-8"):
        return "present"
    return "absent"


def _resolver_verdict(root, config_dir):
    """Runs the runtime resolver against the same fixture tree and returns its verdict."""
    env = {} if config_dir is None else {"DF_CONFIG_DIR": config_dir}
    try:
        selected = resolver.resolve_config_document_path(str(root), env)
    except ValueError as exc:
        assert "Ambiguous DarkFactory configuration" in str(exc), exc
        return "ambiguous"
    return "present" if os.path.exists(selected) else "absent"


# (label, candidate paths relative to the repository root, DF_CONFIG_DIR, expected verdict)
CANDIDATE_FIXTURES = [
    ("no candidate anywhere", [], None, "absent"),
    ("root repo.dfconfig", ["repo.dfconfig"], None, "present"),
    ("root config.dfconfig", ["config.dfconfig"], None, "present"),
    ("root .dfconfig", [".dfconfig"], None, "present"),
    ("two aliases in the root", ["repo.dfconfig", ".dfconfig"], None, "ambiguous"),
    (
        "three aliases in the root",
        ["repo.dfconfig", "config.dfconfig", ".dfconfig"],
        None,
        "ambiguous",
    ),
    ("the default folder", [".darkfactory/repo.dfconfig"], None, "present"),
    (
        "a configured folder",
        ["cfg/repo.dfconfig"],
        "cfg",
        "present",
    ),
    (
        "two aliases in the folder",
        ["cfg/repo.dfconfig", "cfg/.dfconfig"],
        "cfg",
        "ambiguous",
    ),
    (
        "a candidate in each scope",
        ["repo.dfconfig", ".darkfactory/config.dfconfig"],
        None,
        "ambiguous",
    ),
    ("DF_CONFIG_DIR naming the root itself", ["repo.dfconfig"], ".", "present"),
    ("DF_CONFIG_DIR unset but the root configured", ["repo.dfconfig"], "", "present"),
    ("DF_CONFIG_DIR blank", ["repo.dfconfig"], "   ", "present"),
    (
        "DF_CONFIG_DIR blank with a candidate in each scope",
        ["repo.dfconfig", ".darkfactory/repo.dfconfig"],
        "   ",
        "ambiguous",
    ),
    ("DF_CONFIG_DIR with a path that does not exist", ["repo.dfconfig"], "nowhere", "present"),
]


def test_the_workflow_gate_and_the_resolver_agree_on_the_candidate_matrix(tmp_path):
    script = _docs_gate_script()
    for label, candidates, config_dir, expected in CANDIDATE_FIXTURES:
        root = tmp_path / label.replace(" ", "-").replace("/", "-")
        root.mkdir(parents=True)
        for candidate in candidates:
            path = root / candidate
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("{}", encoding="utf-8")
        assert _gate_verdict(script, root, config_dir) == expected, f"workflow gate: {label}"
        assert _resolver_verdict(root, config_dir) == expected, f"resolver: {label}"


def test_the_workflow_gate_and_the_resolver_name_the_same_candidates():
    script = _docs_gate_script()
    declared = next(line for line in script.splitlines() if line.startswith("CONFIG_FILENAMES="))
    gate_filenames = tuple(declared.split("=", 1)[1].strip().strip('"').split())
    assert set(gate_filenames) == set(resolver.CONFIG_FILENAMES)

    default = next(line for line in script.splitlines() if line.startswith("DEFAULT_CONFIG_DIR="))
    assert default.split("=", 1)[1].strip().strip('"') == resolver.DEFAULT_CONFIG_DIR
