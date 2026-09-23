import pathlib
import yaml


def _workflow(path):
    with pathlib.Path(path).open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def _steps(path, job):
    return _workflow(path)["jobs"][job]["steps"]


def _index(steps, name):
    return next(i for i, step in enumerate(steps) if step.get("name") == name)


def test_auto_format_formats_changed_harness_files_before_committing():
    steps = _steps(".github/workflows/auto-format.yml", "format")
    fmt = _index(steps, "Format harness")
    assert fmt < _index(steps, "Commit and push formatting changes")
    step = steps[fmt]
    assert step["if"] == "hashFiles('harness/biome.json') != ''"
    assert step["working-directory"] == "harness"
    assert "bun install --frozen-lockfile" in step["run"]
    assert "biome check --write --changed" in step["run"]


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
    assert _index(docs["steps"], "Detect docs.df") < _index(
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


def test_autonomous_agent_skips_pipeline_failure_issues_and_comments():
    workflow = _workflow(".github/workflows/agent.yml")
    condition = workflow["jobs"]["run-agent"].get("if", "")
    assert "!endsWith(github.event.comment.user.login, '[bot]')" in condition
    assert "!contains(github.event.issue.labels.*.name, 'pipeline-failure')" in condition


def test_failure_observer_only_auto_files_default_branch_incidents():
    workflow = _workflow(".github/workflows/report-failure.yml")
    condition = workflow["jobs"]["report"].get("if", "")
    assert "github.event_name != 'workflow_run'" in condition
    assert (
        "github.event.workflow_run.head_branch == github.event.repository.default_branch"
        in condition
    )


def test_agent_image_installs_from_the_checked_in_harness_lock():
    dockerfile = pathlib.Path("docker/Dockerfile.agent").read_text(encoding="utf-8")
    assert "COPY package.json /opt/darkfactory/" in dockerfile
    assert "COPY harness/ /opt/darkfactory/harness/" in dockerfile
    assert "COPY packages/ /opt/darkfactory/packages/" in dockerfile
    assert "COPY capabilities/ /opt/darkfactory/capabilities/" in dockerfile
    assert "bun install --frozen-lockfile --cwd /opt/darkfactory/harness" in dockerfile
