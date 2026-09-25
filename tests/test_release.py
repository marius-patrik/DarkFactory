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
        manifest: Repository block to write in root `repo.dfconfig`.
        commits: Commit subjects, oldest first.
    """
    subprocess.run(["git", "init", "-q", "-b", "main", str(root)], check=True)
    for key, value in (("user.email", "t@example.com"), ("user.name", "T")):
        subprocess.run(["git", "-C", str(root), "config", key, value], check=True)
    _write(root, "repo.dfconfig", json.dumps({"repo": manifest or {}}))
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
    _write(tmp_path, "repo.dfconfig", json.dumps({"repo": {}}))
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
            "repo.dfconfig",
            json.dumps(
                {
                    "repo": {
                        "release": {"assets": [{"command": "make bundle", "path": "out/*.tar.gz"}]}
                    }
                }
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
        _write(tmp_path, "repo.dfconfig", json.dumps({"repo": {"release": {"assets": ["out/*"]}}}))
        assert release.plan_assets(str(tmp_path))[0]["globs"] == ["out/*"]

    def test_a_repository_with_no_build_plans_nothing(self, tmp_path):
        _write(tmp_path, "README.md", "a template repository")
        _write(tmp_path, "repo.dfconfig", json.dumps({"repo": {}}))
        assert release.plan_assets(str(tmp_path)) == []

    def test_declared_artifact_globs_override_the_defaults(self, monorepo):
        _write(
            monorepo,
            "repo.dfconfig",
            json.dumps({"repo": {"environment": {"release": {"node": {"artifacts": ["out/**"]}}}}}),
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
        _write(tmp_path, "repo.dfconfig", json.dumps({"repo": {}}))
        assert release.check_metadata(str(tmp_path), "9.9.9") == []

    def test_the_check_can_be_switched_off(self, monorepo):
        _write(
            monorepo,
            "repo.dfconfig",
            json.dumps({"repo": {"release": {"metadata": "ignore"}}}),
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
        _write(tmp_path, "repo.dfconfig", json.dumps({"repo": {}}))
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


class TestRecordVersion:
    """The recorded version is what stops the next promotion re-releasing an old number."""

    def _origin(self, tmp_path, manifest=None, version="3a.1.0"):
        """Builds a repository with a bare `origin` so a push has somewhere to land.

        Args:
            tmp_path: Test directory.
            manifest: Repository block for `repo.dfconfig`.
            version: Contents for the `VERSION` file, or `None` for no file.

        Returns:
            The path of the working repository.
        """
        remote = tmp_path / "remote.git"
        subprocess.run(["git", "init", "-q", "--bare", str(remote)], check=True)
        work = tmp_path / "work"
        _repo(work, manifest or {}, [])
        if version is not None:
            _write(work, "VERSION", f"{version}\n")
        subprocess.run(["git", "-C", str(work), "add", "-A"], check=True)
        subprocess.run(
            ["git", "-C", str(work), "commit", "-q", "-m", "chore(ci): seed"], check=True
        )
        identity = (manifest or {}).get("identity", {})
        branch = identity.get("development_branch") or identity.get("default_branch") or "main"
        subprocess.run(["git", "-C", str(work), "branch", "-M", branch], check=True)
        subprocess.run(["git", "-C", str(work), "remote", "add", "origin", str(remote)], check=True)
        subprocess.run(["git", "-C", str(work), "push", "-q", "origin", branch], check=True)
        return work

    def _gh_stub(self, tmp_path, monkeypatch, prs="[]"):
        """Puts a `gh` stub on PATH that records its arguments and reports no open pull request.

        Args:
            tmp_path: Test directory.
            monkeypatch: Pytest monkeypatch fixture.
            prs: JSON the `pr list` stub reports as open pull requests.

        Returns:
            The path of the file the stub appends its arguments to.
        """
        bindir = tmp_path / "bin"
        bindir.mkdir(exist_ok=True)
        log = tmp_path / "gh.log"
        (bindir / "gh").write_text(
            "#!/bin/sh\n"
            f'printf "%s\\n" "$*" >> "{log}"\n'
            'case "$*" in\n'
            f'  *"pr list"*) printf "%s" {prs!r} ;;\n'
            "esac\n"
        )
        (bindir / "gh").chmod(0o755)
        monkeypatch.setenv("PATH", f"{bindir}{os.pathsep}{os.environ['PATH']}")
        return log

    def test_a_stale_version_is_recorded_on_its_own_branch(self, tmp_path, monkeypatch):
        """The record must not land on the protected branch itself."""
        self._gh_stub(tmp_path, monkeypatch)
        work = self._origin(tmp_path, {"identity": {"development_branch": "develop"}})
        result = release.record_version(str(work), "3a.2.0", "v3a.2.0")
        assert result["recorded"] is True
        assert result["branch"] == "release/record-3a.2.0"
        assert result["base"] == "develop"
        assert (work / "VERSION").read_text() == "3a.2.0\n"
        remote = tmp_path / "remote.git"
        assert (
            subprocess.run(
                ["git", "-C", str(remote), "rev-parse", "--verify", "release/record-3a.2.0"],
                capture_output=True,
            ).returncode
            == 0
        )

    def test_recording_the_same_version_twice_changes_nothing(self, tmp_path, monkeypatch):
        """A re-run after a completed release must not ask for a second review."""
        log = self._gh_stub(tmp_path, monkeypatch)
        work = self._origin(
            tmp_path,
            {
                "identity": {"development_branch": "develop"},
                "release": {"record_issue": 1113},
            },
        )
        release.record_version(str(work), "3a.2.0", "v3a.2.0")
        first = subprocess.run(
            ["git", "-C", str(work), "rev-parse", "HEAD"], capture_output=True, text=True
        ).stdout
        again = release.record_version(str(work), "3a.2.0", "v3a.2.0")
        assert again["recorded"] is False
        assert again["pull_request"] is None
        second = subprocess.run(
            ["git", "-C", str(work), "rev-parse", "HEAD"], capture_output=True, text=True
        ).stdout
        assert first == second
        assert log.read_text().count("pr create") == 1

    def test_an_existing_pull_request_is_reused(self, tmp_path, monkeypatch):
        """A release that re-runs while its record request is open must not open a second."""
        log = self._gh_stub(tmp_path, monkeypatch, prs='[{"number": 42}]')
        work = self._origin(
            tmp_path,
            {
                "identity": {"development_branch": "develop"},
                "release": {"record_issue": 1113},
            },
        )
        result = release.record_version(str(work), "3a.2.0", "v3a.2.0")
        assert result["pull_request"] == '[{"number": 42}]'
        assert "pr create" not in log.read_text()

    def test_without_a_bound_issue_the_version_is_still_recorded(self, tmp_path, monkeypatch):
        """`verify-bound-issue` would reject the request, so it is reported rather than opened."""
        log = self._gh_stub(tmp_path, monkeypatch)
        work = self._origin(tmp_path, {"identity": {"development_branch": "develop"}})
        result = release.record_version(str(work), "3a.2.0", "v3a.2.0")
        assert result["recorded"] is True
        assert result["issue"] is None
        assert result["pull_request"] is None
        assert "record_issue" in result["reason"]
        assert not log.exists(), "no pull request may be opened without a bound issue"

    def test_the_pull_request_binds_the_configured_issue(self, tmp_path, monkeypatch):
        log = self._gh_stub(tmp_path, monkeypatch)
        work = self._origin(
            tmp_path,
            {
                "identity": {"development_branch": "develop"},
                "release": {"record_issue": 1113},
            },
        )
        result = release.record_version(str(work), "3a.2.0", "v3a.2.0")
        assert result["issue"] == 1113
        assert "Advances #1113" in log.read_text()

    def test_a_repository_with_one_branch_records_against_it(self, tmp_path, monkeypatch):
        """With no separate development branch the default branch is the integration lane."""
        self._gh_stub(tmp_path, monkeypatch)
        work = self._origin(tmp_path, {"identity": {"default_branch": "trunk"}})
        result = release.record_version(str(work), "3a.2.0", "v3a.2.0")
        assert result["base"] == "trunk"
        assert result["recorded"] is True


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
