"""Tests for generating a repository's installation.

Everything a consumer used to write by hand is derivable except intent, so the tests are mostly
about what gets derived correctly and what is deliberately left for a person to edit.
"""

import json
import os

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


def test_workflow_names_match_what_the_reporter_watches():
    """`report-failure` watches workflows by name; a renamed caller is one it cannot see."""
    watched = {"CI", "Deploy Documentation", "Release", "Update Submodules"}
    names = {
        yaml.safe_load(install.render_caller(w, "o/p", "abc"))["name"] for w in install.WORKFLOWS
    }
    assert watched <= names


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
