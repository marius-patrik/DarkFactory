"""Tests for the per-repository manifest.

The pipeline is distributed byte-for-byte, so anything repository-specific has to come from
`.github/darkfactory.json`. These tests cover the two ways that goes wrong: a manifest that is
missing or malformed and takes the pipeline down with it, and repository-specific values leaking
back into the shared code.
"""

import json
import os
import re

import pytest

import manifest as manifest_module

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT_DIR = os.path.join(REPO_ROOT, ".github", "scripts")


def _write_manifest(root, data):
    """Writes a manifest into a throwaway repository root.

    Args:
        root: Directory to treat as the repository root.
        data: Document to serialise.
    """
    os.makedirs(os.path.join(str(root), ".github"), exist_ok=True)
    with open(os.path.join(str(root), ".github", "darkfactory.json"), "w", encoding="utf-8") as fh:
        json.dump(data, fh)


class TestIdentity:
    """Identity is what differs between repositories, so it is what must be read, not assumed."""

    def test_the_real_manifest_identifies_this_repository(self):
        loaded = manifest_module.load(REPO_ROOT)
        assert loaded.slug == "marius-patrik/DarkFactory"
        assert loaded.homepage == "https://marius-patrik.github.io/DarkFactory/"

    def test_identity_is_read_from_the_manifest(self, tmp_path):
        _write_manifest(tmp_path, {"identity": {"owner": "acme", "repo": "widget"}})
        loaded = manifest_module.load(str(tmp_path))
        assert loaded.slug == "acme/widget"
        assert loaded.homepage == "https://acme.github.io/widget/"

    def test_the_agent_slug_defaults_from_the_repository_name(self, tmp_path):
        _write_manifest(tmp_path, {"identity": {"owner": "acme", "repo": "Widget"}})
        assert manifest_module.load(str(tmp_path)).agent_slug == "widget-agent"

    def test_the_project_title_falls_back_to_the_display_name(self, tmp_path):
        _write_manifest(tmp_path, {"identity": {"owner": "a", "repo": "b", "display_name": "Bee"}})
        assert manifest_module.load(str(tmp_path)).project_title == "Bee"

    def test_a_missing_manifest_still_yields_a_usable_object(self, tmp_path, monkeypatch):
        monkeypatch.setenv("GITHUB_REPOSITORY", "acme/fallback")
        loaded = manifest_module.load(str(tmp_path))
        assert loaded.slug == "acme/fallback"
        assert loaded.topics == []

    def test_a_malformed_manifest_does_not_crash_the_pipeline(self, tmp_path, monkeypatch):
        os.makedirs(os.path.join(str(tmp_path), ".github"))
        path = os.path.join(str(tmp_path), ".github", "darkfactory.json")
        with open(path, "w", encoding="utf-8") as handle:
            handle.write("{ this is not json")
        monkeypatch.setenv("GITHUB_REPOSITORY", "acme/broken")
        assert manifest_module.load(str(tmp_path)).slug == "acme/broken"


class TestAreas:
    """One declaration feeds labels, commit scopes and the classifier."""

    def test_areas_may_be_plain_descriptions(self, tmp_path):
        _write_manifest(tmp_path, {"areas": {"core": "The core", "ui": "The surface"}})
        loaded = manifest_module.load(str(tmp_path))
        assert loaded.areas == {"core": "The core", "ui": "The surface"}

    def test_areas_may_carry_keywords(self, tmp_path):
        _write_manifest(
            tmp_path,
            {"areas": {"core": {"description": "The core", "keywords": ["kernel", "bus"]}}},
        )
        loaded = manifest_module.load(str(tmp_path))
        assert loaded.areas["core"] == "The core"
        assert loaded.area_keywords["core"] == ["kernel", "bus"]

    def test_an_area_without_keywords_matches_its_own_name(self, tmp_path):
        _write_manifest(tmp_path, {"areas": {"telemetry": "Metrics"}})
        assert manifest_module.load(str(tmp_path)).area_keywords["telemetry"] == ["telemetry"]

    def test_labels_are_prefixed_and_coloured(self, tmp_path):
        _write_manifest(tmp_path, {"areas": {"core": "The core"}})
        labels = manifest_module.load(str(tmp_path)).area_labels
        assert labels[0][0] == "area:core"
        assert re.fullmatch(r"[0-9a-f]{6}", labels[0][1]), "colour must be a bare hex triple"

    def test_every_area_gets_a_distinct_colour(self, tmp_path):
        _write_manifest(tmp_path, {"areas": {f"a{i}": str(i) for i in range(9)}})
        labels = manifest_module.load(str(tmp_path)).area_labels
        assert len({colour for _n, colour, _d in labels}) == 9

    def test_scopes_match_the_areas(self, tmp_path):
        _write_manifest(tmp_path, {"areas": {"b": "B", "a": "A"}})
        assert manifest_module.load(str(tmp_path)).area_scopes == ["a", "b"]

    def test_a_declared_default_area_is_used(self, tmp_path):
        _write_manifest(tmp_path, {"areas": {"$default": "ops", "ops": "Ops", "app": "App"}})
        assert manifest_module.load(str(tmp_path)).default_area == "ops"

    def test_comment_keys_are_not_areas(self, tmp_path):
        _write_manifest(tmp_path, {"areas": {"$comment": "note", "app": "App"}})
        assert list(manifest_module.load(str(tmp_path)).areas) == ["app"]

    def test_a_repository_declaring_no_areas_still_has_a_taxonomy(self, tmp_path):
        _write_manifest(tmp_path, {})
        assert manifest_module.load(str(tmp_path)).areas == manifest_module.DEFAULT_AREAS


class TestPages:
    """The Pages source must match the deploy workflow or the first deploy 404s."""

    def test_a_branch_source_produces_a_legacy_payload(self):
        payload = manifest_module.load(REPO_ROOT).pages_payload()
        assert payload["build_type"] == "legacy"
        assert payload["source"]["branch"] == "gh-pages"

    def test_an_undeclared_source_defaults_to_the_actions_build(self, tmp_path):
        _write_manifest(tmp_path, {})
        assert manifest_module.load(str(tmp_path)).pages_payload() == {"build_type": "workflow"}


class TestUpstream:
    """The pin is what makes a distributed pipeline updatable rather than forked."""

    def test_darkfactory_is_its_own_upstream(self):
        assert manifest_module.load(REPO_ROOT).is_upstream

    def test_a_consumer_pins_a_ref(self, tmp_path):
        _write_manifest(
            tmp_path, {"upstream": {"repo": "marius-patrik/DarkFactory", "ref": "abc123"}}
        )
        loaded = manifest_module.load(str(tmp_path))
        assert not loaded.is_upstream
        assert loaded.upstream == {"repo": "marius-patrik/DarkFactory", "ref": "abc123"}


class TestBoards:
    """Boards are account-owned, so a repository only shows the ones linked to it."""

    def test_the_repositorys_own_board_is_always_linked(self, tmp_path):
        _write_manifest(
            tmp_path,
            {"identity": {"owner": "a", "repo": "b", "project_title": "Bee"}, "board": {}},
        )
        assert "Bee" in manifest_module.load(str(tmp_path)).linked_boards

    def test_the_global_board_is_declared(self):
        assert manifest_module.load(REPO_ROOT).global_board_title == "Global"


class TestNoForeignIdentityLeaks:
    """A template seeded from another project inherits its identity unless something checks.

    Every one of these strings was found hardcoded in this repository's pipeline: omnis's areas in
    the label list and the classifier, omnis's ADRs in the notes, and omnis's name in a docstring
    and a CLI description. They belong to a different project and must come from the manifest.
    """

    #: Identifiers that belong to omnis, not to a generic pipeline.
    FOREIGN = ("omnis", "substrate bus", "microkernel", "cell-grid", "pglite", "omnisd")

    @pytest.mark.parametrize("filename", ["repo_settings.py", "manifest.py", "environment.py"])
    def test_shared_scripts_name_no_other_project(self, filename):
        path = os.path.join(SCRIPT_DIR, filename)
        content = open(path, encoding="utf-8").read().lower()
        for token in self.FOREIGN:
            assert token not in content, f"{filename} still hardcodes {token!r}"

    def test_the_area_taxonomy_is_not_another_projects(self):
        areas = set(manifest_module.load(REPO_ROOT).areas)
        assert not areas & {"term", "browser", "ext", "ui"}, "omnis's areas are still declared"


class TestRequiredChecks:
    """Calling a reusable workflow renames every check, and protection must follow."""

    def test_this_repository_uses_the_bare_names(self):
        checks = manifest_module.load(REPO_ROOT).required_checks
        assert "pipeline (3.12)" in checks
        assert "verify-bound-issue" in checks

    def test_a_consumer_declares_the_prefixed_names(self, tmp_path):
        _write_manifest(
            tmp_path, {"required_checks": ["pipeline / pipeline (3.12)", "pipeline / docs"]}
        )
        assert manifest_module.load(str(tmp_path)).required_checks == [
            "pipeline / pipeline (3.12)",
            "pipeline / docs",
        ]

    def test_declaring_none_falls_back_to_the_defaults(self, tmp_path):
        _write_manifest(tmp_path, {})
        loaded = manifest_module.load(str(tmp_path))
        assert loaded.required_checks == list(manifest_module.DEFAULT_REQUIRED_CHECKS)
