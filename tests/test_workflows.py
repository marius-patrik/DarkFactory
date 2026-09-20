import pathlib
import yaml


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


def test_agent_image_installs_from_the_checked_in_harness_lock():
    dockerfile = pathlib.Path("docker/Dockerfile.agent").read_text(encoding="utf-8")
    assert "COPY package.json /opt/darkfactory/" in dockerfile
    assert "COPY harness/ /opt/darkfactory/harness/" in dockerfile
    assert "COPY packages/ /opt/darkfactory/packages/" in dockerfile
    assert "COPY capabilities/ /opt/darkfactory/capabilities/" in dockerfile
    assert "bun install --frozen-lockfile --cwd /opt/darkfactory/harness" in dockerfile
