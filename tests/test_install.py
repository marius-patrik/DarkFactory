"""Tests for generating a repository's installation.

Everything a consumer used to write by hand is derivable except intent, so the tests are mostly
about what gets derived correctly and what is deliberately left for a person to edit.
"""

import json
import os
import re

import pytest
import yaml

import install


def test_every_generated_workflow_is_valid_yaml_with_permissions():
    """A called workflow is capped by its caller's permissions, so a caller without them fails."""
    files = install.plan("o", "r", "abc", root=".")
    workflows = {k: v for k, v in files.items() if k.endswith(".yml")}
    assert workflows, "an installation is mostly workflows"
    for path, content in workflows.items():
        parsed = yaml.safe_load(content)
        assert "permissions" in parsed, f"{path} must declare permissions"
        assert parsed["jobs"], f"{path} must call something"


def _triggers(document: dict) -> dict:
    """Returns a workflow's `on:` block.

    PyYAML reads the bare key `on` as the boolean `True`, so both spellings are tried.

    Args:
        document: Parsed workflow.

    Returns:
        The trigger mapping.
    """
    return document.get(True) or document["on"]


def test_the_reporter_watches_every_workflow_it_installs():
    """`report-failure` matches by display name, and a name matching nothing never fires.

    The previous version of this test asserted a hardcoded set was a *subset* of the names, which
    is true of any list that names real workflows and says nothing about the ones it omits. It
    passed for as long as the reporter watched four workflows out of eleven.
    """
    installed = install.relevant_workflows(".")
    caller = yaml.safe_load(
        install.render_caller("report-failure", "o/p", "abc", installed=installed)
    )
    watched = set(_triggers(caller)["workflow_run"]["workflows"])

    expected = {
        yaml.safe_load(install.render_caller(name, "o/p", "abc", installed=installed))["name"]
        for name in installed
        if name != "report-failure"
    }
    assert watched == expected


def test_the_pin_reaches_both_places_it_is_needed():
    """The `uses:` ref and the `pipeline-ref` input must not drift apart."""
    rendered = install.render_caller("ci", "o/p", "deadbeef")
    assert "ci.yml@deadbeef" in rendered
    assert 'pipeline-ref: "deadbeef"' in rendered


def test_submodule_updating_is_offered_only_where_there_are_submodules(tmp_path):
    """Installing a submodule updater in a repository with none is noise."""
    assert "update-submodules" not in install.relevant_workflows(str(tmp_path))
    (tmp_path / ".gitmodules").write_text('[submodule "x"]\n\tpath = x\n', encoding="utf-8")
    assert "update-submodules" in install.relevant_workflows(str(tmp_path))


def test_a_tooling_only_pyproject_is_declared_as_packaging_nothing(tmp_path):
    """The failure that took three repositories down is pre-empted at install time."""
    (tmp_path / "pyproject.toml").write_text("[tool.black]\nline-length = 100\n", encoding="utf-8")
    manifest = json.loads(install.render_manifest("o", "r", "abc", root=str(tmp_path)))
    assert manifest["environment"]["release"]["python"]["enabled"] is False


def test_a_real_package_is_left_to_release_normally(tmp_path):
    """Declaring nothing is only right when there is nothing to package."""
    (tmp_path / "pyproject.toml").write_text(
        '[project]\nname = "thing"\nversion = "1.0.0"\n', encoding="utf-8"
    )
    manifest = json.loads(install.render_manifest("o", "r", "abc", root=str(tmp_path)))
    assert "environment" not in manifest


def test_areas_are_offered_rather_than_asserted(tmp_path):
    """Areas describe a repository's own domains, which cannot be derived."""
    manifest = json.loads(install.render_manifest("o", "r", "abc", root=str(tmp_path)))
    assert "$comment" in manifest["areas"], "the starter set must say it is a starting point"


def test_writing_never_overwrites_what_is_already_there(tmp_path):
    """A reinstall must not discard a caller someone deliberately customised."""
    target = tmp_path / ".github" / "workflows"
    target.mkdir(parents=True)
    (target / "ci.yml").write_text("name: mine\n", encoding="utf-8")
    install.write(install.plan("o", "r", "abc", root=str(tmp_path)), str(tmp_path))
    assert (target / "ci.yml").read_text(encoding="utf-8") == "name: mine\n"
    assert (tmp_path / ".github" / "darkfactory.json").is_file(), "the rest is still written"


class TestConfigurationIssue:
    """Installation ends by asking a person for what it could not decide."""

    def test_the_marker_makes_a_reinstall_find_it_rather_than_duplicate(self):
        """Identity lives in the body so a retitled issue is still recognised."""
        body = install.configuration_issue("o/r", "o/p")
        assert install.CONFIG_MARKER in body

    def test_it_asks_for_exactly_what_cannot_be_derived(self):
        """Areas, credentials, publishing and lock-down: the four human decisions."""
        body = install.configuration_issue("o/r", "o/p")
        for topic in ("Areas", "GH_PROJECT_TOKEN", "Pages", "Branch protection"):
            assert topic in body, f"the issue must cover {topic}"

    def test_submodules_are_mentioned_only_when_there_are_some(self):
        """A repository without submodules should not be told to check its .gitmodules."""
        assert "update-submodules" not in install.configuration_issue("o/r", "o/p")
        assert "update-submodules" in install.configuration_issue(
            "o/r", "o/p", needs_submodules=True
        )

    def test_it_explains_why_protection_is_left_off(self):
        """Turning it on too early blocks every merge on a context nothing reports."""
        body = install.configuration_issue("o/r", "o/p")
        assert "green" in body and "blocks every merge" in body


def test_the_generated_manifest_makes_the_licence_a_visible_choice():
    """An absent licence block reads as an oversight; NONE reads as a decision."""
    import json

    manifest = json.loads(install.render_manifest("o", "r", "abc", root="."))
    assert manifest["license"]["spdx"] == "NONE"
    assert "$comment" in manifest["license"], "it must say what NONE means"


def _pipeline_workflow(name: str) -> dict:
    """Loads one of the pipeline's own workflow files.

    Args:
        name: Workflow file name without its suffix.

    Returns:
        The parsed workflow.
    """
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    with open(os.path.join(root, ".github", "workflows", f"{name}.yml"), encoding="utf-8") as f:
        return yaml.safe_load(f)


def test_an_installation_includes_the_agent():
    """A repository with no agent reports on work it cannot do.

    This is what `mono-OdbornaPrace` was: a manifest, a board, CI, releases and docs, and two
    issues that sat untouched because no workflow on the default branch listens for them.
    """
    installed = install.relevant_workflows(".")
    for name in ("agent", "open-pr", "pr-approval-automerge", "verify-pr-issue", "auto-format"):
        assert name in installed, f"an installation without {name} cannot run the governed flow"


def test_the_agent_caller_can_be_switched_off_without_a_commit():
    """`AGENT_ENABLED` gates the job, so the caller has to forward it."""
    caller = yaml.safe_load(install.render_caller("agent", "o/p", "abc"))
    assert caller["jobs"]["agent"]["with"]["agent-enabled"] == "${{ vars.AGENT_ENABLED }}"


def test_open_pr_declares_and_forwards_every_input():
    """A called workflow receives nothing from the caller's `inputs` context automatically."""
    caller = yaml.safe_load(install.render_caller("open-pr", "o/p", "abc"))
    upstream = _triggers(_pipeline_workflow("open-pr"))["workflow_call"]["inputs"]
    expected = {k for k in upstream if not k.startswith("pipeline-")}

    declared = set(_triggers(caller)["workflow_dispatch"]["inputs"])
    assert declared == expected
    for name in expected:
        assert caller["jobs"]["open-pr"]["with"][name] == f"${{{{ inputs.{name} }}}}"


@pytest.mark.parametrize("name", sorted(install.WORKFLOWS))
def test_every_caller_targets_a_callable_pipeline_workflow(name: str):
    """A caller pointing at a workflow that does not accept calls fails only at run time.

    Args:
        name: Workflow file name without its suffix.
    """
    upstream = _pipeline_workflow(name)
    assert "workflow_call" in _triggers(upstream), f"{name} does not accept being called"

    caller = yaml.safe_load(install.render_caller(name, "o/p", "abc"))
    job = next(iter(caller["jobs"].values()))
    assert job["uses"].endswith(f".github/workflows/{name}.yml@abc")


@pytest.mark.parametrize("name", sorted(install.WORKFLOWS))
def test_every_forwarded_value_is_an_input_the_workflow_declares(name: str):
    """Passing an undeclared input is an error; omitting a required one is a failure at run time.

    Args:
        name: Workflow file name without its suffix.
    """
    upstream = _triggers(_pipeline_workflow(name))["workflow_call"].get("inputs") or {}
    caller = yaml.safe_load(install.render_caller(name, "o/p", "abc"))
    passed = next(iter(caller["jobs"].values())).get("with") or {}

    assert set(passed) <= set(upstream), f"{name} is passed inputs it does not declare"
    required = {k for k, v in upstream.items() if v.get("required")}
    assert required <= set(passed), f"{name} is not given inputs it requires"


def test_every_watched_name_is_a_workflow_that_exists():
    """The pipeline's own reporter watches by display name too, and had one that matched nothing."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    directory = os.path.join(root, ".github", "workflows")
    names = set()
    watchers = {}
    for entry in sorted(os.listdir(directory)):
        document = _pipeline_workflow(entry[:-4])
        names.add(document["name"])
        run = _triggers(document).get("workflow_run")
        if run:
            watchers[entry] = run["workflows"]

    assert watchers, "the pipeline must watch something"
    for path, watched in watchers.items():
        unknown = [w for w in watched if w not in names]
        assert unknown == [], f"{path} watches workflows that do not exist: {unknown}"


def test_the_generated_manifest_requires_contexts_that_will_actually_report():
    """Branch protection matches contexts by string, and a mismatch blocks every merge silently.

    A repository calling the pipeline as a reusable workflow sees every check prefixed with the
    caller's job name, so the unprefixed defaults would protect a branch against names nothing
    reports.
    """
    manifest = json.loads(install.render_manifest("o", "r", "abc", root="."))
    contexts = manifest["required_checks"]
    assert contexts, "a generated manifest must declare its own contexts"

    installed = install.relevant_workflows(".")
    for context in contexts:
        caller, _, check = context.partition(" / ")
        assert caller in installed, f"{context} names a caller this install does not write"
        assert check, f"{context} is not a prefixed context"


def test_no_required_context_comes_from_a_workflow_that_is_not_installed():
    """Requiring a check nothing runs is the same failure in a different shape."""
    contexts = install.required_contexts(["ci"])
    assert all(c.startswith("ci / ") for c in contexts)
    assert not any("verify-bound-issue" in c for c in contexts)


def test_every_default_check_has_a_caller_that_reports_it():
    """A check with no source would be dropped from protection without anyone noticing."""
    import manifest as manifest_module

    installed = install.relevant_workflows(".")
    covered = {c.partition(" / ")[2] for c in install.required_contexts(installed)}
    assert covered == set(manifest_module.DEFAULT_REQUIRED_CHECKS)


class TestReinstallingAdoptsTheUpdate:
    """Never overwriting a file meant a reinstall could not update anything either."""

    def _installed(self, tmp_path, ref="aaaaaaa"):
        """Writes a first installation into a temporary directory.

        Args:
            tmp_path: Pytest temporary directory.
            ref: Pipeline commit to pin.

        Returns:
            The root path as a string.
        """
        root = str(tmp_path)
        install.write(install.plan("o", "r", ref, root=root), root)
        return root

    def test_the_pin_moves(self, tmp_path):
        """Adopting a pipeline release is the one thing a reinstall most needs to do.

        Args:
            tmp_path: Pytest temporary directory.
        """
        root = self._installed(tmp_path)
        changed = install.retarget(root, "bbbbbbb")
        assert changed, "every caller pins the ref twice and both must move"

        with open(os.path.join(root, ".github", "workflows", "ci.yml"), encoding="utf-8") as f:
            content = f.read()
        assert "aaaaaaa" not in content
        assert content.count("bbbbbbb") == 2

    def test_nothing_else_in_a_customised_caller_is_touched(self, tmp_path):
        """The rule that made reinstalling safe must survive the change that made it useful.

        Args:
            tmp_path: Pytest temporary directory.
        """
        root = self._installed(tmp_path)
        path = os.path.join(root, ".github", "workflows", "ci.yml")
        with open(path, encoding="utf-8") as handle:
            content = handle.read()
        customised = content.replace("permissions:", "# a local edit\npermissions:", 1)
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(customised)

        install.retarget(root, "bbbbbbb")
        with open(path, encoding="utf-8") as handle:
            after = handle.read()
        assert "# a local edit" in after
        assert after == customised.replace("aaaaaaa", "bbbbbbb")

    def test_a_missing_manifest_key_is_filled_in(self, tmp_path):
        """An installation written before `required_checks` existed protects against nothing.

        Args:
            tmp_path: Pytest temporary directory.
        """
        root = self._installed(tmp_path)
        path = os.path.join(root, ".github", "darkfactory.json")
        with open(path, encoding="utf-8") as handle:
            manifest = json.load(handle)
        del manifest["required_checks"]
        manifest["identity"]["display_name"] = "Chosen By Hand"
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(manifest, handle)

        planned = install.render_manifest("o", "r", "bbbbbbb", root=root)
        assert install.reconcile_manifest(root, "bbbbbbb", planned)

        with open(path, encoding="utf-8") as handle:
            after = json.load(handle)
        assert after["required_checks"], "the missing key is filled in"
        assert after["identity"]["display_name"] == "Chosen By Hand", "choices are not overwritten"
        assert after["upstream"]["ref"] == "bbbbbbb", "the pin is what a reinstall exists to move"

    def test_an_up_to_date_manifest_is_left_alone(self, tmp_path):
        """A reinstall that changes nothing must produce no diff to review.

        Args:
            tmp_path: Pytest temporary directory.
        """
        root = self._installed(tmp_path, ref="bbbbbbb")
        planned = install.render_manifest("o", "r", "bbbbbbb", root=root)
        assert not install.reconcile_manifest(root, "bbbbbbb", planned)


def test_a_caller_pinned_to_a_branch_is_repinned_to_the_commit(tmp_path):
    """A branch is not a pin: it follows whatever lands there, so the bump diff never exists.

    Several callers were generated this way, and a repin that matched only commit SHAs left exactly
    those alone - the case that most needed fixing.

    Args:
        tmp_path: Pytest temporary directory.
    """
    root = str(tmp_path)
    install.write(install.plan("o", "r", "aaaaaaa", root=root), root)
    path = os.path.join(root, ".github", "workflows", "ci.yml")
    with open(path, encoding="utf-8") as handle:
        content = handle.read()
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content.replace("ci.yml@aaaaaaa", "ci.yml@darkfactory"))

    install.retarget(root, "bbbbbbb")
    with open(path, encoding="utf-8") as handle:
        after = handle.read()
    assert "@darkfactory" not in after
    assert after.count("bbbbbbb") == 2


def test_every_generated_caller_pins_a_commit():
    """The generator itself must never produce a branch pin."""
    files = install.plan("o", "r", "0123456789abcdef0123456789abcdef01234567", root=".")
    for path, content in files.items():
        if not path.endswith(".yml"):
            continue
        for line in content.splitlines():
            if ".yml@" in line:
                ref = line.rsplit("@", 1)[1].strip()
                assert re.fullmatch(r"[0-9a-f]{7,40}", ref), f"{path} pins {ref!r}, not a commit"
