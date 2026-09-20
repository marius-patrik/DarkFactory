import pathlib
import yaml

YAML_PATH = pathlib.Path(".github/workflows/df-dispatch.yml")


def load_workflow():
    with YAML_PATH.open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def test_on_triggers():
    wf = load_workflow()
    # PyYAML (YAML 1.1) reads the bare key `on` as the boolean True.
    on = wf.get("on", wf.get(True, {}))
    # Expected trigger keys
    expected_keys = {
        "issues",
        "issue_comment",
        "pull_request_review",
        "check_suite",
        "schedule",
        "workflow_call",
    }
    assert set(on.keys()) == expected_keys
    # Check types for each
    assert on["issues"].get("types") == ["opened", "labeled"]
    assert on["issue_comment"].get("types") == ["created"]
    assert on["pull_request_review"].get("types") == ["submitted"]
    assert on["check_suite"].get("types") == ["completed"]
    # schedule should be list with one dict containing cron
    schedule = on["schedule"]
    assert isinstance(schedule, list) and len(schedule) == 1
    assert schedule[0].get("cron") == "*/15 * * * *"


def test_job_if_condition():
    wf = load_workflow()
    job = wf["jobs"]["dispatch"]
    assert job.get("if") == "github.event.sender.type != 'Bot'"


def test_permissions_readonly():
    wf = load_workflow()
    perms = wf["jobs"]["dispatch"].get("permissions", {})
    expected = {
        "contents": "read",
        "checks": "write",
        "issues": "read",
        "pull-requests": "read",
    }
    assert perms == expected


def test_final_step_cli_command():
    wf = load_workflow()
    steps = wf["jobs"]["dispatch"]["steps"]
    # Find step with name containing 'Run DF Dispatch'
    run_step = next(s for s in steps if s.get("name", "").startswith("Run DF Dispatch"))
    run_cmd = run_step.get("run", "")
    assert "--shadow" in run_cmd
    assert '--summary "$GITHUB_STEP_SUMMARY"' in run_cmd


def _steps(path, job):
    with pathlib.Path(path).open("r", encoding="utf-8") as f:
        return yaml.safe_load(f)["jobs"][job]["steps"]


def _index(steps, name):
    return next(i for i, step in enumerate(steps) if step.get("name") == name)


def test_auto_format_formats_changed_harness_files_before_committing():
    steps = _steps(".github/workflows/auto-format.yml", "format")
    fmt = _index(steps, "Format harness")
    assert fmt < _index(steps, "Commit and push formatting changes")
    step = steps[fmt]
    # Consumer repositories call this workflow and have no harness.
    assert step["if"] == "hashFiles('harness/biome.json') != ''"
    assert step["working-directory"] == "harness"
    assert "bun install --frozen-lockfile" in step["run"]
    assert "biome check --write --changed" in step["run"]


def test_ci_blocks_on_harness_format_and_lint_before_typecheck():
    steps = _steps(".github/workflows/ci.yml", "harness")
    check = _index(steps, "Check harness formatting and lint")
    assert check < _index(steps, "Typecheck harness")
    step = steps[check]
    assert "continue-on-error" not in step
    assert "biome ci --changed" in step["run"]
    assert steps[0]["with"]["fetch-depth"] == 0


def test_dispatch_runs_the_bundled_graph_with_a_token_for_the_checks_gate():
    wf = load_workflow()
    steps = wf["jobs"]["dispatch"]["steps"]
    run_step = next(s for s in steps if s.get("name", "").startswith("Run DF Dispatch"))
    assert "--graph .darkfactory-pipeline/harness/assets/graph.darkfactory.json" in run_step["run"]
    assert run_step.get("env", {}).get("GH_TOKEN") == "${{ github.token }}"


def test_autonomous_agent_skips_pipeline_failure_issues_and_comments():
    with pathlib.Path(".github/workflows/agent.yml").open("r", encoding="utf-8") as f:
        wf = yaml.safe_load(f)
    condition = wf["jobs"]["run-agent"].get("if", "")
    assert "!endsWith(github.event.comment.user.login, '[bot]')" in condition
    assert "!contains(github.event.issue.labels.*.name, 'pipeline-failure')" in condition
