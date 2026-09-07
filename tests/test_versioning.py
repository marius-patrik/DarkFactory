"""Tests for the configurable versioning modes.

Each mode encodes a different claim about what a version number means, so the interesting cases are
the ones where the modes disagree about the same commit log.
"""

import datetime
import json
import os
import subprocess

import pytest

import versioning

BREAKING = "feat(agents)!: replace the harness invocation contract"
BREAKING_TRAILER = (
    "refactor(agents): rework the chain\n\nBREAKING CHANGE: harness ids are now namespaced"
)
FEATURE = "feat(release): add a versioning mode"
FIX = "fix(ci): stop dropping the final log line"
CHORE = "chore(ci): bump the runner image"


class TestClassifyCommits:
    """The commit log is the input every automatic mode shares."""

    def test_a_bang_marks_a_breaking_change(self):
        assert versioning.classify_commits([BREAKING]) == "major"

    def test_a_breaking_change_trailer_counts_too(self):
        assert versioning.classify_commits([BREAKING_TRAILER]) == "major"

    def test_a_feature_is_a_minor_bump(self):
        assert versioning.classify_commits([FEATURE]) == "minor"

    def test_a_fix_is_a_patch_bump(self):
        assert versioning.classify_commits([FIX]) == "patch"

    def test_the_largest_bump_in_the_batch_wins(self):
        assert versioning.classify_commits([FIX, FEATURE, CHORE]) == "minor"
        assert versioning.classify_commits([FIX, BREAKING]) == "major"

    def test_chores_alone_do_not_warrant_a_release(self):
        assert versioning.classify_commits([CHORE]) is None

    def test_non_conventional_messages_are_ignored(self):
        assert versioning.classify_commits(["wip", "asdf", ""]) is None


class TestSemver:
    """The baseline every other numeric mode is defined against."""

    @pytest.mark.parametrize(
        "current, bump, expected",
        [
            ("1.2.3", "major", "2.0.0"),
            ("1.2.3", "minor", "1.3.0"),
            ("1.2.3", "patch", "1.2.4"),
        ],
    )
    def test_bumps(self, current, bump, expected):
        assert versioning.next_version("semver", current, bump) == expected


class TestZeroVer:
    """ "Your software's major version should never exceed [...] zero.\" """

    @pytest.mark.parametrize("bump", ["major", "minor", "patch"])
    def test_the_major_never_leaves_zero(self, bump):
        result = versioning.next_version("zerover", "0.9.8", bump)
        assert result.startswith("0."), f"{bump} produced {result}, which escapes ZeroVer"

    def test_a_breaking_change_lands_on_the_minor_instead_of_the_major(self):
        # Under semver this would be 1.0.0; ZeroVer's whole point is that it must not be.
        assert versioning.next_version("zerover", "0.9.8", "major") == "0.10.0"
        assert versioning.next_version("semver", "0.9.8", "major") == "1.0.0"

    def test_patches_still_move_the_patch(self):
        assert versioning.next_version("zerover", "0.4.0", "patch") == "0.4.1"

    def test_it_never_escapes_however_many_breaking_changes_land(self):
        version = "0.1.0"
        for _ in range(50):
            version = versioning.next_version("zerover", version, "major")
        assert version.split(".")[0] == "0"


class TestPrideVer:
    """`PROUD.DEFAULT.SHAME` - pride cannot be inferred, but shame can."""

    def test_a_fix_bumps_shame(self):
        assert versioning.next_version("pridever", "1.2.3", "patch") == "1.2.4"

    def test_an_ordinary_release_bumps_default(self):
        assert versioning.next_version("pridever", "1.2.3", "minor") == "1.3.0"

    def test_a_breaking_change_is_still_only_a_default_bump(self):
        # Breaking is not the same as proud; only a human declares pride.
        assert versioning.next_version("pridever", "1.2.3", "major") == "1.3.0"

    def test_pride_resets_the_slate(self):
        assert versioning.next_version("pridever", "1.2.3", "proud") == "2.0.0"

    def test_pride_is_meaningless_in_other_modes(self):
        with pytest.raises(versioning.VersioningError):
            versioning.next_version("semver", "1.2.3", "proud")


class TestCalVer:
    """`YYYY.MM.PATCH`, counting releases within the month."""

    def test_the_first_release_of_a_month_starts_at_zero(self):
        day = datetime.date(2026, 9, 7)
        assert versioning.next_version("calver", "2026.08.4", "minor", today=day) == "2026.09.0"

    def test_a_later_release_in_the_same_month_increments(self):
        day = datetime.date(2026, 9, 7)
        assert versioning.next_version("calver", "2026.09.0", "patch", today=day) == "2026.09.1"

    def test_the_bump_size_does_not_matter(self):
        day = datetime.date(2026, 9, 7)
        results = {
            versioning.next_version("calver", "2026.09.3", bump, today=day)
            for bump in ("patch", "minor", "major")
        }
        assert results == {"2026.09.4"}


class TestNoRelease:
    """Nothing release-worthy means no tag, in every mode."""

    @pytest.mark.parametrize("mode", ["semver", "zerover", "pridever", "calver"])
    def test_a_none_bump_produces_no_version(self, mode):
        assert versioning.next_version(mode, "1.2.3", None) is None

    def test_manual_never_derives_anything(self):
        assert versioning.next_version("manual", "1.2.3", "major") is None

    def test_an_unknown_mode_is_rejected(self):
        with pytest.raises(versioning.VersioningError):
            versioning.next_version("heroic", "1.2.3", "patch")


class TestLatestTag:
    """Tags are the source of truth, and repositories accumulate junk ones."""

    def test_it_picks_the_highest_not_the_last(self):
        assert versioning.latest_tag(["v0.1.0", "v0.10.0", "v0.9.0"]) == "v0.10.0"

    def test_non_release_tags_are_ignored(self):
        assert versioning.latest_tag(["nightly", "v1.0.0", "release-candidate"]) == "v1.0.0"

    def test_no_tags_means_no_current_version(self):
        assert versioning.latest_tag([]) is None
        assert versioning.latest_tag(["nightly"]) is None

    def test_two_component_tags_are_accepted(self):
        assert versioning.latest_tag(["v1.2"]) == "v1.2"


def _init_repo(path, mode, commits):
    """Builds a throwaway git repository carrying a manifest and a commit log.

    Args:
        path: Directory to initialise.
        mode: Versioning mode to declare in the manifest.
        commits: Commit subjects to record, oldest first.
    """
    subprocess.run(["git", "init", "-q", "-b", "main", str(path)], check=True)
    for key, value in (("user.email", "t@example.com"), ("user.name", "T")):
        subprocess.run(["git", "-C", str(path), "config", key, value], check=True)
    github = path / ".github"
    github.mkdir()
    (github / "darkfactory.json").write_text(json.dumps({"versioning": {"mode": mode}}))
    for index, message in enumerate(commits):
        (path / f"f{index}.txt").write_text(message)
        subprocess.run(["git", "-C", str(path), "add", "-A"], check=True)
        subprocess.run(["git", "-C", str(path), "commit", "-q", "-m", message], check=True)


class TestResolve:
    """End to end against a real repository, since git behaviour is half the logic."""

    def test_a_first_release_uses_the_configured_initial_version(self, tmp_path):
        _init_repo(tmp_path, "semver", [FEATURE])
        assert versioning.resolve(str(tmp_path))["next"] == "0.1.0"

    def test_nothing_release_worthy_yields_no_release(self, tmp_path):
        _init_repo(tmp_path, "semver", [CHORE])
        result = versioning.resolve(str(tmp_path))
        assert result["next"] is None
        assert result["tag"] is None

    def test_an_explicit_bump_overrides_the_commit_log(self, tmp_path):
        _init_repo(tmp_path, "semver", [CHORE])
        subprocess.run(["git", "-C", str(tmp_path), "tag", "v1.0.0"], check=True)
        # The log says "no release"; the human says "minor".
        assert versioning.resolve(str(tmp_path), "minor")["next"] == "1.1.0"

    def test_an_exact_version_can_be_requested(self, tmp_path):
        _init_repo(tmp_path, "semver", [CHORE])
        result = versioning.resolve(str(tmp_path), "3.2.1")
        assert result["next"] == "3.2.1"
        assert result["tag"] == "v3.2.1"
        assert result["bump"] == "explicit"

    def test_a_proud_release_can_be_requested_under_pridever(self, tmp_path):
        _init_repo(tmp_path, "pridever", [FIX])
        subprocess.run(["git", "-C", str(tmp_path), "tag", "v1.4.2"], check=True)
        assert versioning.resolve(str(tmp_path), "proud")["next"] == "2.0.0"

    def test_the_same_log_gives_different_answers_per_mode(self, tmp_path):
        results = {}
        for mode in ("semver", "zerover", "pridever"):
            repo = tmp_path / mode
            repo.mkdir()
            _init_repo(repo, mode, [BREAKING])
            subprocess.run(["git", "-C", str(repo), "tag", "v0.9.8"], check=True)
            (repo / "later.txt").write_text("x")
            subprocess.run(["git", "-C", str(repo), "add", "-A"], check=True)
            subprocess.run(["git", "-C", str(repo), "commit", "-q", "-m", BREAKING], check=True)
            results[mode] = versioning.resolve(str(repo))["next"]
        assert results == {"semver": "1.0.0", "zerover": "0.10.0", "pridever": "0.10.0"}

    def test_manual_mode_requires_a_version_file(self, tmp_path):
        _init_repo(tmp_path, "manual", [FEATURE])
        with pytest.raises(versioning.VersioningError):
            versioning.resolve(str(tmp_path))

    def test_manual_mode_reads_the_version_file(self, tmp_path):
        _init_repo(tmp_path, "manual", [FEATURE])
        (tmp_path / "VERSION").write_text("7.7.7\n")
        result = versioning.resolve(str(tmp_path))
        assert result["next"] == "7.7.7"
        assert result["tag"] == "v7.7.7"

    def test_manual_mode_is_idempotent_once_tagged(self, tmp_path):
        _init_repo(tmp_path, "manual", [FEATURE])
        (tmp_path / "VERSION").write_text("7.7.7\n")
        subprocess.run(["git", "-C", str(tmp_path), "tag", "v7.7.7"], check=True)
        assert versioning.resolve(str(tmp_path))["next"] is None

    def test_an_unknown_mode_in_the_manifest_is_rejected(self, tmp_path):
        _init_repo(tmp_path, "heroic", [FEATURE])
        with pytest.raises(versioning.VersioningError):
            versioning.resolve(str(tmp_path))

    def test_a_repository_without_a_manifest_defaults_to_semver(self, tmp_path):
        _init_repo(tmp_path, "semver", [FEATURE])
        os.remove(tmp_path / ".github" / "darkfactory.json")
        assert versioning.resolve(str(tmp_path))["mode"] == "semver"
