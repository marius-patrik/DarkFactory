"""Tests for the combined configuration's repository block.

The pipeline is distributed byte-for-byte, so anything repository-specific has to come from the
`repo` block in the selected `repo.dfconfig`, `config.dfconfig`, or `.dfconfig` document. These tests cover discovery,
block selection, malformed input and repository-specific value isolation.
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
    with open(os.path.join(str(root), "repo.dfconfig"), "w", encoding="utf-8") as fh:
        json.dump({"repo": data}, fh)


class TestIdentity:
    """Identity is what differs between repositories, so it is what must be read, not assumed."""

    def test_the_real_manifest_identifies_this_repository(self):
        loaded = manifest_module.load(REPO_ROOT)
        assert loaded.slug == "marius-patrik/DarkFactory"
        assert loaded.homepage == "https://marius-patrik.github.io/DarkFactory/"
        assert loaded.default_branch == "main"
        assert loaded.development_branch == "develop"

    def test_identity_is_read_from_the_manifest(self, tmp_path):
        _write_manifest(tmp_path, {"identity": {"owner": "acme", "repo": "widget"}})
        loaded = manifest_module.load(str(tmp_path))
        assert loaded.slug == "acme/widget"
        assert loaded.homepage == "https://acme.github.io/widget/"
        assert loaded.development_branch == loaded.default_branch == "main"

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

    def test_a_malformed_manifest_fails_closed(self, tmp_path):
        with open(os.path.join(str(tmp_path), "repo.dfconfig"), "w", encoding="utf-8") as handle:
            handle.write("{ this is not json")
        with pytest.raises(ValueError, match="Invalid DarkFactory configuration JSON"):
            manifest_module.load(str(tmp_path))

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

    def test_the_actions_source_is_declared(self):
        payload = manifest_module.load(REPO_ROOT).pages_payload()
        assert payload["build_type"] == "workflow"

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
    """Final direct workflows expose stable aggregate protection contexts."""

    def test_this_repository_uses_the_bare_names(self):
        checks = manifest_module.load(REPO_ROOT).required_checks
        assert "quality" in checks
        assert "verify-bound-issue" in checks

    def test_a_consumer_can_still_override_required_checks(self, tmp_path):
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


class TestApp:
    """The App is the pipeline's own identity, recorded so nothing has to guess at it."""

    def test_the_app_identity_is_recorded(self):
        app = manifest_module.load(REPO_ROOT).app
        assert app["slug"] == "darkfactory-pipeline"
        assert isinstance(app["app_id"], int)

    def test_the_private_key_is_named_but_never_stored(self):
        app = manifest_module.load(REPO_ROOT).app
        assert app["private_key_secret"] == "DARKFACTORY_APP_PRIVATE_KEY"
        serialised = json.dumps(app)
        assert "BEGIN RSA PRIVATE KEY" not in serialised
        assert "BEGIN PRIVATE KEY" not in serialised

    def test_a_repository_without_an_app_is_fine(self, tmp_path):
        _write_manifest(tmp_path, {})
        assert manifest_module.load(str(tmp_path)).app == {}


class TestIdentities:
    """Agent and pipeline identities are manifest-declared."""

    def test_the_real_manifest_declares_identities(self):
        loaded = manifest_module.load(REPO_ROOT)
        assert "app" in loaded.identities
        assert "google" in loaded.identities
        assert "claude" in loaded.identities
        assert (
            loaded.bot_commit_author
            == "darkfactory-pipeline[bot] <326069535+darkfactory-pipeline[bot]@users.noreply.github.com>"
        )
        assert loaded.identity_for("google")["name"] == "Gemini"
        assert loaded.identity_for("google")["verified"] is True
        assert (
            loaded.identity_for("claude")["trailer"]
            == "Co-authored-by: Claude <noreply@anthropic.com>"
        )

    def test_identities_fall_back_to_defaults_when_undeclared(self, tmp_path):
        _write_manifest(tmp_path, {})
        loaded = manifest_module.load(str(tmp_path))
        assert "app" in loaded.identities
        assert (
            loaded.bot_commit_author
            == "darkfactory-pipeline[bot] <326069535+darkfactory-pipeline[bot]@users.noreply.github.com>"
        )
        assert loaded.identity_for("google")["name"] == "Gemini"

    def test_custom_declared_identities(self, tmp_path):
        _write_manifest(
            tmp_path,
            {
                "identities": {
                    "app": {
                        "login": "custom-bot[bot]",
                        "user_id": 999999,
                        "commit_author_email": "custom-bot@example.com",
                    },
                    "custom-provider": {
                        "name": "Custom Provider",
                        "trailer": "Co-authored-by: Custom <custom@example.com>",
                        "verified": True,
                    },
                }
            },
        )
        loaded = manifest_module.load(str(tmp_path))
        assert loaded.bot_commit_author == "custom-bot[bot] <custom-bot@example.com>"
        custom = loaded.identity_for("custom-provider")
        assert custom is not None
        assert custom["name"] == "Custom Provider"
        assert custom["verified"] is True
        assert loaded.identity_for("nonexistent") is None


class TestConfigDocumentDiscovery:
    """The combined document is selected once and all consumers read their own block."""

    def test_canonical_root_repo_is_selected(self, tmp_path):
        _write_manifest(tmp_path, {"identity": {"owner": "acme", "repo": "widget"}})
        assert manifest_module.resolve_manifest_path(str(tmp_path)) == os.path.join(
            str(tmp_path), "repo.dfconfig"
        )

    def test_root_config_alias_is_selected(self, tmp_path):
        path = tmp_path / "config.dfconfig"
        path.write_text(
            json.dumps({"repo": {"identity": {"owner": "acme", "repo": "alias"}}}),
            encoding="utf-8",
        )
        assert manifest_module.resolve_manifest_path(str(tmp_path)) == str(path)
        assert manifest_module.load(str(tmp_path)).repo == "alias"

    def test_empty_basename_alias_is_selected(self, tmp_path):
        path = tmp_path / ".dfconfig"
        path.write_text(
            json.dumps({"repo": {"identity": {"owner": "acme", "repo": "empty-alias"}}}),
            encoding="utf-8",
        )
        assert manifest_module.resolve_manifest_path(str(tmp_path)) == str(path)
        assert manifest_module.load(str(tmp_path)).repo == "empty-alias"

    def test_custom_config_directory_is_selected(self, tmp_path, monkeypatch):
        path = tmp_path / "configuration" / "repo.dfconfig"
        path.parent.mkdir()
        path.write_text(
            json.dumps({"repo": {"identity": {"owner": "acme", "repo": "custom"}}}),
            encoding="utf-8",
        )
        monkeypatch.setenv("DF_CONFIG_DIR", "configuration")
        assert manifest_module.resolve_manifest_path(str(tmp_path)) == str(path)

    def test_default_darkfactory_fallback_is_supported(self, tmp_path):
        path = tmp_path / ".darkfactory" / "config.dfconfig"
        path.parent.mkdir()
        path.write_text(
            json.dumps({"repo": {"identity": {"owner": "acme", "repo": "fallback"}}}),
            encoding="utf-8",
        )
        assert manifest_module.resolve_manifest_path(str(tmp_path)) == str(path)
        assert manifest_module.load(str(tmp_path)).repo == "fallback"

    def test_duplicate_aliases_in_one_scope_are_rejected(self, tmp_path):
        (tmp_path / "repo.dfconfig").write_text(json.dumps({"repo": {}}), encoding="utf-8")
        (tmp_path / "config.dfconfig").write_text(json.dumps({"repo": {}}), encoding="utf-8")
        (tmp_path / ".dfconfig").write_text(json.dumps({"repo": {}}), encoding="utf-8")
        with pytest.raises(ValueError, match="Ambiguous DarkFactory configuration aliases"):
            manifest_module.resolve_manifest_path(str(tmp_path))

    def test_root_and_folder_candidates_are_rejected(self, tmp_path):
        (tmp_path / "repo.dfconfig").write_text(json.dumps({"repo": {}}), encoding="utf-8")
        fallback = tmp_path / ".darkfactory"
        fallback.mkdir()
        (fallback / "config.dfconfig").write_text(json.dumps({"repo": {}}), encoding="utf-8")
        with pytest.raises(ValueError, match="candidates exist in both the repository root"):
            manifest_module.resolve_manifest_path(str(tmp_path))

    @pytest.mark.parametrize("filename", ["repo.df", "config.df"])
    def test_legacy_configuration_paths_are_not_used(self, tmp_path, filename):
        path = tmp_path / filename
        path.write_text(
            json.dumps({"repo": {"areas": {"legacy": "Legacy declaration"}}}),
            encoding="utf-8",
        )
        assert manifest_module.resolve_manifest_path(str(tmp_path)) == os.path.join(
            str(tmp_path), ".darkfactory", "repo.dfconfig"
        )
        assert manifest_module.load(str(tmp_path)).areas == manifest_module.DEFAULT_AREAS

    @pytest.mark.parametrize("filename", ["repo.dfconfig", "config.dfconfig", ".dfconfig"])
    def test_supported_names_select_the_same_combined_document(self, tmp_path, filename):
        path = tmp_path / filename
        document = {
            "repo": {"identity": {"owner": "acme", "repo": filename}},
            "docs": {"version": 1, "home": ".agents/PRD.md"},
            "providers": {"defaultChain": "example/model@default"},
        }
        path.write_text(json.dumps(document), encoding="utf-8")
        assert manifest_module.resolve_manifest_path(str(tmp_path)) == str(path)
        assert manifest_module.load(str(tmp_path)).repo == filename
        assert manifest_module.load_config_block(str(tmp_path), "docs") == document["docs"]
        assert (
            manifest_module.load_config_block(str(tmp_path), "providers") == document["providers"]
        )

    def test_repo_consumer_does_not_read_provider_fields(self, tmp_path):
        (tmp_path / "repo.dfconfig").write_text(
            json.dumps(
                {
                    "repo": {"identity": {"owner": "repo-owner", "repo": "repo-name"}},
                    "providers": {"identity": {"owner": "wrong", "repo": "wrong"}},
                }
            ),
            encoding="utf-8",
        )
        loaded = manifest_module.load(str(tmp_path))
        assert loaded.slug == "repo-owner/repo-name"
