"""Computes the next release version under a configurable versioning mode.

The pipeline releases on merge to `main`, but what a version number *means* is a per-project
choice, so the scheme is data rather than code. A repository declares its mode in
`.github/darkfactory.json`; this module turns "what landed since the last tag" into "what the next
tag is called" under that mode.

Five modes are supported:

`semver`
    Conventional Commits mapped the usual way: a breaking change bumps major, `feat` bumps minor,
    `fix` and `perf` bump patch.

`zerover`
    SemVer with the major clamped to zero, per the specification's single rule: "Your software's
    major version should never exceed the first and most important number in computing: zero."
    A breaking change therefore bumps the minor instead of the major, and the version stays `0.y.z`
    for the life of the project.

`pridever`
    `PROUD.DEFAULT.SHAME`. Pride is subjective and cannot be derived from a commit log, so PROUD
    only ever moves on an explicit request; bumping it resets the rest (`1.2.3` -> `2.0.0`). `fix`
    commits bump SHAME - the component the specification reserves for "fixing things too
    embarrassing to admit" - and everything else bumps DEFAULT.

`calver`
    `YYYY.MM.PATCH`, where PATCH counts releases within the current month and resets when the month
    changes.

`manual`
    The version is whatever the `VERSION` file says. Nothing is derived; the file is the decision.

Under every automatic mode an explicit request still wins, so a human can force a bump the commit
log would not have produced.
"""

import datetime
import json
import os
import re
import subprocess
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

#: Every versioning mode this module understands.
MODES: Tuple[str, ...] = ("semver", "zerover", "pridever", "calver", "manual")

#: Bump sizes, ordered from smallest to largest, shared by the numeric modes.
BUMPS: Tuple[str, ...] = ("patch", "minor", "major")

#: Conventional Commit types that mean "a user-visible fix", i.e. the smallest bump.
PATCH_TYPES: Tuple[str, ...] = ("fix", "perf", "revert")

#: Conventional Commit types that mean "a user-visible addition", i.e. a middle bump.
MINOR_TYPES: Tuple[str, ...] = ("feat",)

#: `type(scope)!: subject` - the `!` and a `BREAKING CHANGE:` trailer both mean a breaking change.
_HEADER = re.compile(r"^(?P<type>[a-z]+)(?:\((?P<scope>[^)]*)\))?(?P<bang>!)?:\s")

_BREAKING_TRAILER = re.compile(r"^BREAKING[ -]CHANGE:", re.MULTILINE)

#: A release tag: optional `v`, then two or three dot-separated numbers.
_TAG = re.compile(r"^v?(?P<nums>\d+(?:\.\d+){1,2})$")


class VersioningError(ValueError):
    """Raised when a repository's versioning configuration cannot be honoured."""


def load_config(repo_root: str) -> Dict[str, object]:
    """Reads the versioning block from the repository manifest.

    Args:
        repo_root: Path to the repository root.

    Returns:
        The `versioning` object from `.github/darkfactory.json`, defaulted where absent.

    Raises:
        VersioningError: If the declared mode is not one this module implements.
    """
    manifest_path = os.path.join(repo_root, ".github", "darkfactory.json")
    config: Dict[str, object] = {}
    if os.path.isfile(manifest_path):
        with open(manifest_path, encoding="utf-8") as handle:
            config = dict(json.load(handle).get("versioning", {}))

    mode = str(config.get("mode", "semver"))
    if mode not in MODES:
        raise VersioningError(f"unknown versioning mode {mode!r}; expected one of {list(MODES)}")
    config["mode"] = mode
    config.setdefault("tag_prefix", "v")
    config.setdefault("initial", "0.1.0" if mode in ("zerover", "pridever") else "0.1.0")
    return config


def classify_commits(subjects: Iterable[str]) -> Optional[str]:
    """Derives the bump size implied by a batch of Conventional Commit messages.

    Args:
        subjects: Commit messages, each the full message (subject plus body).

    Returns:
        `"major"`, `"minor"`, `"patch"`, or `None` when nothing release-worthy landed.
    """
    result: Optional[str] = None
    for message in subjects:
        header = message.splitlines()[0] if message else ""
        match = _HEADER.match(header)
        if not match:
            continue
        if match.group("bang") or _BREAKING_TRAILER.search(message):
            return "major"
        commit_type = match.group("type")
        if commit_type in MINOR_TYPES:
            result = "minor"
        elif commit_type in PATCH_TYPES and result is None:
            result = "patch"
    return result


def _parse(tag: str) -> Optional[List[int]]:
    """Turns a release tag into its numeric components.

    Args:
        tag: Tag name, with or without a leading `v`.

    Returns:
        The components as integers, padded to three, or `None` if the tag is not a release tag.
    """
    match = _TAG.match(tag.strip())
    if not match:
        return None
    parts = [int(piece) for piece in match.group("nums").split(".")]
    while len(parts) < 3:
        parts.append(0)
    return parts


def latest_tag(tags: Sequence[str]) -> Optional[str]:
    """Picks the highest release tag from a list, ignoring anything that is not one.

    Args:
        tags: Candidate tag names.

    Returns:
        The highest tag, or `None` when the repository has never been released.
    """
    parsed = [(nums, tag) for tag in tags if (nums := _parse(tag)) is not None]
    if not parsed:
        return None
    return max(parsed)[1]


def next_version(
    mode: str,
    current: Optional[str],
    bump: Optional[str],
    today: Optional[datetime.date] = None,
) -> Optional[str]:
    """Applies a bump to the current version under the given mode.

    Args:
        mode: One of `MODES`.
        current: The current version, or `None` if nothing has been released yet.
        bump: `"major"`, `"minor"`, `"patch"`, or `"proud"` for PrideVer. `None` means the commit
            log implied no release.
        today: Date used by `calver`; defaults to the current UTC date.

    Returns:
        The next version string, or `None` when no release is warranted.

    Raises:
        VersioningError: If the mode is unknown, or `proud` is requested outside PrideVer.
    """
    if mode not in MODES:
        raise VersioningError(f"unknown versioning mode {mode!r}")
    if mode == "manual":
        return None
    if bump == "proud" and mode != "pridever":
        raise VersioningError("a 'proud' bump is only meaningful under pridever")
    if bump is None:
        return None

    if mode == "calver":
        day = today or datetime.datetime.now(datetime.timezone.utc).date()
        stamp = f"{day.year}.{day.month:02d}"
        parts = _parse(current) if current else None
        if parts and current and current.startswith(f"{stamp}."):
            return f"{stamp}.{parts[2] + 1}"
        return f"{stamp}.0"

    major, minor, patch = _parse(current) if current else (0, 0, 0)

    if mode == "pridever":
        if bump == "proud":
            return f"{major + 1}.0.0"
        # `fix` is the SHAME component; everything else is an ordinary release.
        if bump == "patch":
            return f"{major}.{minor}.{patch + 1}"
        return f"{major}.{minor + 1}.0"

    if mode == "zerover":
        # The major never leaves zero, so a breaking change lands on the minor instead.
        if bump in ("major", "minor"):
            return f"0.{minor + 1}.0"
        return f"0.{minor}.{patch + 1}"

    if bump == "major":
        return f"{major + 1}.0.0"
    if bump == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def git_tags(repo_root: str) -> List[str]:
    """Lists the repository's tags.

    Args:
        repo_root: Path to the repository root.

    Returns:
        Tag names, or an empty list when git is unavailable or there are none.
    """
    try:
        result = subprocess.run(
            ["git", "tag", "--list"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):  # pragma: no cover - environment guard
        return []
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def commits_since(repo_root: str, tag: Optional[str]) -> List[str]:
    """Collects commit messages added since a tag.

    Args:
        repo_root: Path to the repository root.
        tag: The tag to measure from, or `None` to take the whole history.

    Returns:
        Full commit messages, newest first.
    """
    span = f"{tag}..HEAD" if tag else "HEAD"
    try:
        result = subprocess.run(
            ["git", "log", span, "--format=%B%x00"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
    except (OSError, subprocess.CalledProcessError):  # pragma: no cover - environment guard
        return []
    return [chunk.strip() for chunk in result.stdout.split("\0") if chunk.strip()]


def read_manual_version(repo_root: str) -> Optional[str]:
    """Reads the `VERSION` file used by `manual` mode.

    Args:
        repo_root: Path to the repository root.

    Returns:
        The declared version, or `None` when the file is absent or empty.
    """
    path = os.path.join(repo_root, "VERSION")
    if not os.path.isfile(path):
        return None
    with open(path, encoding="utf-8") as handle:
        return handle.read().strip() or None


def resolve(repo_root: str, requested: Optional[str] = None) -> Dict[str, Optional[str]]:
    """Works out the next release for a repository.

    Args:
        repo_root: Path to the repository root.
        requested: An explicit bump requested by a human, which overrides the commit log. Accepts
            any of `BUMPS`, `"proud"`, or an exact version string.

    Returns:
        A mapping with `mode`, `current`, `next`, `tag` and `bump`. `next` is `None` when no
        release is warranted.

    Raises:
        VersioningError: If `manual` mode is selected but no `VERSION` file exists.
    """
    config = load_config(repo_root)
    mode = str(config["mode"])
    prefix = str(config["tag_prefix"])

    tags = git_tags(repo_root)
    current_tag = latest_tag(tags)
    current = current_tag.lstrip("v") if current_tag else None

    if mode == "manual":
        declared = read_manual_version(repo_root)
        if declared is None:
            raise VersioningError(
                "manual versioning requires a VERSION file at the repository root"
            )
        upcoming = declared if declared != current else None
        return {
            "mode": mode,
            "current": current,
            "next": upcoming,
            "tag": f"{prefix}{upcoming}" if upcoming else None,
            "bump": "manual" if upcoming else None,
        }

    bump: Optional[str]
    if requested and _parse(requested):
        upcoming = requested.lstrip("v")
        return {
            "mode": mode,
            "current": current,
            "next": upcoming,
            "tag": f"{prefix}{upcoming}",
            "bump": "explicit",
        }
    if requested:
        bump = requested
    else:
        bump = classify_commits(commits_since(repo_root, current_tag))

    if current is None and bump is not None:
        upcoming = str(config["initial"])
    else:
        upcoming = next_version(mode, current, bump)

    return {
        "mode": mode,
        "current": current,
        "next": upcoming,
        "tag": f"{prefix}{upcoming}" if upcoming else None,
        "bump": bump,
    }


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Prints the resolved release as JSON, for a workflow step to consume."""
    import argparse

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="repository to inspect")
    parser.add_argument(
        "--bump",
        default=os.environ.get("REQUESTED_BUMP") or None,
        help="explicit bump: patch, minor, major, proud, or an exact version",
    )
    args = parser.parse_args()
    print(json.dumps(resolve(args.repo_root, args.bump), indent=2))


if __name__ == "__main__":  # pragma: no cover
    main()
