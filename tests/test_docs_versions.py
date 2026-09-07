"""Tests for the documentation version switcher's manifest.

The switcher is only as honest as this file: it offers whatever the manifest lists, so the manifest
has to describe what is actually published rather than what a workflow intended to publish.
"""

import json
import os

import docs_versions


def _site(tmp_path, *paths):
    """Builds a fake published site.

    Args:
        tmp_path: Base directory.
        *paths: Directories to create beneath it.

    Returns:
        The site root as a string.
    """
    for path in paths:
        os.makedirs(os.path.join(str(tmp_path), path), exist_ok=True)
    return str(tmp_path)


class TestDiscover:
    """What is on the branch is the source of truth."""

    def test_the_root_build_is_always_offered_first(self, tmp_path):
        entries = docs_versions.discover(_site(tmp_path), "main")
        assert entries == [{"name": "main", "path": ""}]

    def test_pull_request_previews_are_found(self, tmp_path):
        root = _site(tmp_path, "pr-27", "pr-8")
        names = [entry["name"] for entry in docs_versions.discover(root, "main")]
        assert "PR #27" in names and "PR #8" in names

    def test_previews_are_listed_newest_first(self, tmp_path):
        root = _site(tmp_path, "pr-8", "pr-27", "pr-13")
        previews = [e["name"] for e in docs_versions.discover(root, "main") if "PR" in e["name"]]
        assert previews == ["PR #27", "PR #13", "PR #8"]

    def test_branch_builds_are_found(self, tmp_path):
        root = _site(tmp_path, "branch/darkfactory", "branch/next")
        paths = [entry["path"] for entry in docs_versions.discover(root, "main")]
        assert "branch/darkfactory" in paths and "branch/next" in paths

    def test_unrelated_directories_are_not_offered(self, tmp_path):
        root = _site(tmp_path, "assets", "architecture", "pr-not-a-number")
        assert docs_versions.discover(root, "main") == [{"name": "main", "path": ""}]

    def test_a_torn_down_preview_disappears(self, tmp_path):
        root = _site(tmp_path, "pr-27")
        assert len(docs_versions.discover(root, "main")) == 2
        os.rmdir(os.path.join(root, "pr-27"))
        assert len(docs_versions.discover(root, "main")) == 1


class TestProjects:
    """The Project axis is what puts the shared pipeline one hop from any consumer."""

    def test_declared_projects_are_read(self, tmp_path):
        os.makedirs(os.path.join(str(tmp_path), ".github"))
        with open(os.path.join(str(tmp_path), ".github", "darkfactory.json"), "w") as handle:
            json.dump(
                {"documentation": {"projects": [{"name": "Omnis", "url": "https://example/"}]}},
                handle,
            )
        assert docs_versions.projects(str(tmp_path)) == [
            {"name": "Omnis", "url": "https://example/"}
        ]

    def test_entries_missing_a_url_are_dropped(self, tmp_path):
        os.makedirs(os.path.join(str(tmp_path), ".github"))
        with open(os.path.join(str(tmp_path), ".github", "darkfactory.json"), "w") as handle:
            json.dump({"documentation": {"projects": [{"name": "Broken"}]}}, handle)
        assert docs_versions.projects(str(tmp_path)) == []

    def test_a_repository_without_a_manifest_offers_none(self, tmp_path):
        assert docs_versions.projects(str(tmp_path)) == []

    def test_this_repository_offers_its_siblings(self):
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        names = {entry["name"] for entry in docs_versions.projects(root)}
        assert {"DarkFactory", "Omnis", "ChessWithQuests"} <= names


class TestBuild:
    """The whole manifest, as the browser will receive it."""

    def test_it_serialises(self, tmp_path):
        root = _site(tmp_path, "pr-3")
        manifest = docs_versions.build(root, root, "main")
        assert json.loads(json.dumps(manifest)) == manifest
        assert manifest["current"] == ""
        assert {"versions", "projects", "current"} == set(manifest)
