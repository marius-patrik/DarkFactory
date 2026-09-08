"""Tests for release assembly: notes, assets, and metadata conformance.

A release is four decisions - whether, what it is called, what goes in it, and whether the
repository agrees with itself - so the tests are organised the same way.
"""

import json
import os
import subprocess

import pytest

import release


def _write(root, relative, content):
    """Writes a file, creating parent directories.

    Args:
        root: Base directory.
        relative: Path relative to `root`.
        content: Text to write.
    """
    path = os.path.join(str(root), relative)
    if os.path.dirname(relative):
        os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)


def _repo(root, manifest=None, commits=()):
    """Builds a throwaway git repository.

    Args:
        root: Directory to initialise.
        manifest: Document to write as `.github/darkfactory.json`.
        commits: Commit subjects, oldest first.
    """
    subprocess.run(["git", "init", "-q", "-b", "main", str(root)], check=True)
    for key, value in (("user.email", "t@example.com"), ("user.name", "T")):
        subprocess.run(["git", "-C", str(root), "config", key, value], check=True)
    _write(root, ".github/darkfactory.json", json.dumps(manifest or {}))
    for index, message in enumerate(commits):
        _write(root, f"f{index}.txt", message)
        subprocess.run(["git", "-C", str(root), "add", "-A"], check=True)
        subprocess.run(["git", "-C", str(root), "commit", "-q", "-m", message], check=True)


@pytest.fixture
def monorepo(tmp_path):
    """A Bun workspace whose CLI package has fallen behind the others."""
    _write(
        tmp_path,
        "package.json",
        json.dumps({"name": "acme", "version": "1.4.0", "workspaces": ["packages/*"]}),
    )
    _write(tmp_path, "bun.lock", "")
    _write(
        tmp_path, "packages/web/package.json", json.dumps({"name": "@acme/web", "version": "1.4.0"})
    )
    _write(
        tmp_path, "packages/cli/package.json", json.dumps({"name": "@acme/cli", "version": "1.3.9"})
    )
    _write(tmp_path, ".github/darkfactory.json", json.dumps({}))
    return tmp_path


class TestNotes:
    """Notes are grouped by Conventional Commit type, and empty sections are omitted."""

    def test_commits_are_grouped_under_headings(self):
        notes = release.build_notes(
            ["feat(ci): add a job", "fix(docs): correct a link"], "1.1.0", "1.0.0"
        )
        assert "### Features" in notes and "**ci**: add a job" in notes
        assert "### Fixes" in notes and "**docs**: correct a link" in notes

    def test_sections_with_no_commits_are_omitted(self):
        notes = release.build_notes(["feat(ci): add a job"], "1.1.0", "1.0.0")
        assert "### Fixes" not in notes
        assert "### Maintenance" not in notes

    def test_breaking_changes_lead(self):
        notes = release.build_notes(
            ["fix(ci): small thing", "feat(agents)!: change the contract"], "2.0.0", "1.0.0"
        )
        assert notes.index("### Breaking changes") < notes.index("### Fixes")

    def test_a_breaking_change_trailer_is_recognised(self):
        notes = release.build_notes(
            ["refactor(ci): rework\n\nBREAKING CHANGE: ids are namespaced"], "2.0.0", "1.0.0"
        )
        assert "### Breaking changes" in notes

    def test_a_scopeless_commit_still_appears(self):
        assert "add a thing" in release.build_notes(["feat: add a thing"], "1.1.0", "1.0.0")

    def test_non_conventional_commits_are_skipped(self):
        notes = release.build_notes(["wip", "asdf"], "1.0.1", "1.0.0")
        assert "No user-facing changes recorded." in notes

    def test_a_first_release_says_so(self):
        assert "First release." in release.build_notes(["feat: x"], "0.1.0", None)

    def test_a_later_release_names_its_predecessor(self):
        assert "since `1.0.0`" in release.build_notes(["feat: x"], "1.1.0", "1.0.0")


class TestAssetPlanning:
    """Detection and declaration compose; neither replaces the other."""

    def test_detected_ecosystems_produce_build_steps(self, monorepo):
        steps = release.plan_assets(str(monorepo))
        assert any(step["ecosystem"] == "node" for step in steps)
        assert any("bun run build" == step["command"] for step in steps)

    def test_a_workspace_root_is_built_once_not_per_member(self, monorepo):
        steps = [s for s in release.plan_assets(str(monorepo)) if s["ecosystem"] == "node"]
        assert len(steps) == 1, "building each workspace member repeats the root's own build"
        assert steps[0]["cwd"] == "."

    def test_declared_assets_are_appended(self, tmp_path):
        _write(tmp_path, "README.md", "nothing to detect")
        _write(
            tmp_path,
            ".github/darkfactory.json",
            json.dumps(
                {"release": {"assets": [{"command": "make bundle", "path": "out/*.tar.gz"}]}}
            ),
        )
        steps = release.plan_assets(str(tmp_path))
        assert steps == [
            {
                "command": "make bundle",
                "cwd": ".",
                "globs": ["out/*.tar.gz"],
                "ecosystem": "declared",
            }
        ]

    def test_a_declared_asset_may_be_a_bare_glob(self, tmp_path):
        _write(tmp_path, "README.md", "x")
        _write(tmp_path, ".github/darkfactory.json", json.dumps({"release": {"assets": ["out/*"]}}))
        assert release.plan_assets(str(tmp_path))[0]["globs"] == ["out/*"]

    def test_a_repository_with_no_build_plans_nothing(self, tmp_path):
        _write(tmp_path, "README.md", "a template repository")
        _write(tmp_path, ".github/darkfactory.json", json.dumps({}))
        assert release.plan_assets(str(tmp_path)) == []

    def test_declared_artifact_globs_override_the_defaults(self, monorepo):
        _write(
            monorepo,
            ".github/darkfactory.json",
            json.dumps({"environment": {"release": {"node": {"artifacts": ["out/**"]}}}}),
        )
        steps = [s for s in release.plan_assets(str(monorepo)) if s["ecosystem"] == "node"]
        assert steps[0]["globs"] == ["out/**"]


class TestAssetCollection:
    """Globs only matter once something has actually been written."""

    def test_only_existing_files_are_collected(self, tmp_path):
        _write(tmp_path, "dist/app.whl", "x")
        steps = [{"command": None, "cwd": ".", "globs": ["dist/*.whl", "dist/*.tar.gz"]}]
        assert release.collect_assets(str(tmp_path), steps) == ["dist/app.whl"]

    def test_directories_are_not_collected(self, tmp_path):
        os.makedirs(os.path.join(str(tmp_path), "dist", "nested"))
        _write(tmp_path, "dist/nested/app.js", "x")
        steps = [{"command": None, "cwd": ".", "globs": ["dist/**"]}]
        assert release.collect_assets(str(tmp_path), steps) == ["dist/nested/app.js"]

    def test_the_same_file_matched_twice_appears_once(self, tmp_path):
        _write(tmp_path, "dist/app.whl", "x")
        steps = [{"command": None, "cwd": ".", "globs": ["dist/*.whl", "dist/app.whl"]}]
        assert release.collect_assets(str(tmp_path), steps) == ["dist/app.whl"]

    def test_nothing_built_yields_no_assets(self, tmp_path):
        steps = [{"command": None, "cwd": ".", "globs": ["dist/*"]}]
        assert release.collect_assets(str(tmp_path), steps) == []


class TestMetadataConformance:
    """A tag that contradicts the artifact's own metadata is worse than no release."""

    def test_a_lagging_package_is_reported(self, monorepo):
        problems = release.check_metadata(str(monorepo), "1.4.0")
        assert len(problems) == 1
        assert "packages/cli/package.json" in problems[0]
        assert "1.3.9" in problems[0]

    def test_a_conformant_monorepo_reports_nothing(self, monorepo):
        _write(
            monorepo,
            "packages/cli/package.json",
            json.dumps({"name": "@acme/cli", "version": "1.4.0"}),
        )
        assert release.check_metadata(str(monorepo), "1.4.0") == []

    def test_packages_that_declare_no_version_are_not_faulted(self, tmp_path):
        _write(tmp_path, "pyproject.toml", "[tool.black]\nline-length = 100\n")
        _write(tmp_path, ".github/darkfactory.json", json.dumps({}))
        assert release.check_metadata(str(tmp_path), "9.9.9") == []

    def test_the_check_can_be_switched_off(self, monorepo):
        _write(
            monorepo,
            ".github/darkfactory.json",
            json.dumps({"release": {"metadata": "ignore"}}),
        )
        assert release.check_metadata(str(monorepo), "1.4.0") == []

    def test_sync_brings_every_manifest_into_line(self, monorepo):
        changed = release.sync_metadata(str(monorepo), "1.5.0")
        assert "packages/cli/package.json" in changed
        assert release.check_metadata(str(monorepo), "1.5.0") == []

    def test_sync_only_touches_the_version(self, monorepo):
        release.sync_metadata(str(monorepo), "1.5.0")
        with open(os.path.join(str(monorepo), "packages/cli/package.json"), encoding="utf-8") as fh:
            data = json.load(fh)
        assert data == {"name": "@acme/cli", "version": "1.5.0"}

    def test_sync_handles_toml_manifests(self, tmp_path):
        _write(tmp_path, "Cargo.toml", '[package]\nname = "thing"\nversion = "0.1.0"\n')
        _write(tmp_path, ".github/darkfactory.json", json.dumps({}))
        release.sync_metadata(str(tmp_path), "0.2.0")
        content = open(os.path.join(str(tmp_path), "Cargo.toml"), encoding="utf-8").read()
        assert 'version = "0.2.0"' in content
        assert 'name = "thing"' in content


class TestResolveRelease:
    """The whole decision, end to end against a real repository."""

    def test_nothing_release_worthy_produces_no_release(self, tmp_path):
        _repo(tmp_path, {}, ["chore(ci): bump the image"])
        resolved = release.resolve_release(str(tmp_path))
        assert resolved["version"] is None
        assert resolved["steps"] == []

    def test_a_feature_produces_a_first_release_with_notes(self, tmp_path):
        _repo(tmp_path, {}, ["feat(ci): add the pipeline"])
        resolved = release.resolve_release(str(tmp_path))
        assert resolved["version"] == "0.1.0"
        assert resolved["tag"] == "v0.1.0"
        assert "add the pipeline" in resolved["notes"]

    def test_the_versioning_mode_is_honoured(self, tmp_path):
        _repo(tmp_path, {"versioning": {"mode": "pridever"}}, ["feat(ci): x"])
        subprocess.run(["git", "-C", str(tmp_path), "tag", "v1.2.3"], check=True)
        assert release.resolve_release(str(tmp_path), "proud")["version"] == "2.0.0"

    def test_metadata_problems_surface_on_the_release(self, tmp_path):
        _repo(tmp_path, {}, ["feat(ci): add the pipeline"])
        _write(tmp_path, "package.json", json.dumps({"name": "a", "version": "9.9.9"}))
        resolved = release.resolve_release(str(tmp_path))
        assert resolved["metadata_problems"], "a package at 9.9.9 cannot ship as 0.1.0 unnoticed"


class TestPaperReleases:
    """A paper releases its PDF, and its version lives in `typst.toml` like any other manifest."""

    def test_the_pdf_is_planned_as_a_release_asset(self, tmp_path):
        """`plan_assets` derives assets from the build plan, so the document comes along."""
        (tmp_path / "typst.toml").write_text(
            '[package]\nname = "thesis"\nversion = "1.0.0"\n', encoding="utf-8"
        )
        steps = release.plan_assets(str(tmp_path))
        assert any("out/*.pdf" in step["globs"] for step in steps)
        assert any(step["command"].startswith("typst compile") for step in steps)

    def test_a_paper_takes_part_in_version_tagging(self, tmp_path):
        """`typst.toml` must agree with the release the same way `pyproject.toml` does."""
        (tmp_path / "typst.toml").write_text(
            '[package]\nname = "thesis"\nversion = "1.0.0"\n', encoding="utf-8"
        )
        assert release.check_metadata(str(tmp_path), "1.0.0") == []
        problems = release.check_metadata(str(tmp_path), "2.0.0")
        assert len(problems) == 1 and "typst.toml" in problems[0]
