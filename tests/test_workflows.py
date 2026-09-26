import pathlib
import yaml


def _workflow(path):
    with pathlib.Path(path).open("r", encoding="utf-8") as handle:
        workflow = yaml.safe_load(handle)
        if True in workflow and "on" not in workflow:
            workflow["on"] = workflow.pop(True)
        return workflow


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


def test_ci_trigger_includes_stacked_pr_branches():
    workflow = _workflow(".github/workflows/ci.yml")
    push_branches = workflow["on"]["push"]["branches"]
    assert "develop" in push_branches
    assert "refactor/*" in push_branches
    assert "finish/*" in push_branches


def test_ci_pull_request_trigger_has_no_branch_filter_and_base_ref_changed():
    workflow = _workflow(".github/workflows/ci.yml")
    pr_trigger = workflow["on"]["pull_request"]
    assert "branches" not in pr_trigger
    assert "types" in pr_trigger
    assert "base_ref_changed" in pr_trigger["types"]
    assert "opened" in pr_trigger["types"]
    assert "synchronize" in pr_trigger["types"]
    assert "reopened" in pr_trigger["types"]


def test_autonomous_agent_skips_pipeline_failure_issues_and_comments():
    workflow = _workflow(".github/workflows/agent.yml")
    condition = workflow["jobs"]["run-agent"].get("if", "")
    assert "!endsWith(github.event.comment.user.login, '[bot]')" in condition
    assert "!contains(github.event.issue.labels.*.name, 'pipeline-failure')" in condition


def test_failure_observer_only_auto_files_default_branch_incidents():
    workflow = _workflow(".github/workflows/report-failure.yml")
    triggers = workflow.get(True) or workflow["on"]
    assert triggers["workflow_run"]["types"] == ["completed"]
    assert "workflow_call" in triggers
    assert "File or resolve the failure issue" in str(workflow["jobs"]["report"]["steps"])


def test_agent_image_installs_from_the_checked_in_harness_lock():
    dockerfile = pathlib.Path("docker/Dockerfile.agent").read_text(encoding="utf-8")
    assert "COPY package.json /opt/darkfactory/" in dockerfile
    assert "COPY harness/ /opt/darkfactory/harness/" in dockerfile
    assert "COPY packages/ /opt/darkfactory/packages/" in dockerfile
    assert "COPY capabilities/ /opt/darkfactory/capabilities/" in dockerfile
    assert "bun install --frozen-lockfile --cwd /opt/darkfactory/harness" in dockerfile
    assert "COPY pyproject.toml requirements-dev.txt" in dockerfile
    assert "pip install --no-cache-dir -r requirements-dev.txt" in dockerfile
