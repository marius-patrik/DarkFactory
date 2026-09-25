"""Computes the next release version under a configurable versioning mode.

The pipeline releases on merge to `main`, but what a version number *means* is a per-project
choice, so the scheme is data rather than code. A repository declares its mode in the combined
configuration's `repo` block; this module turns "what landed since the last tag" into "what the next
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
    The `VERSION` file is the owner's control. A value that differs from the last release is
    released verbatim, because naming a version is a decision no commit log can make. A value that
    already matches the last release is treated as "carry on from here": the pipeline classifies
    the commits since that release and advances the file itself, in whatever scheme the file is
    written in. That way the file never has to be edited by hand before a promotion, and a
    promoted branch that has nothing worth releasing says so instead of re-releasing.

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

#: A release version: two or three dot-separated components whose first may carry a scheme suffix
#: (`3a.1.0`), so a repository's own numbering is legible to the comparison instead of invisible to
#: it. A tag is this with the prefix in front, which is stripped before parsing.
_VERSION = re.compile(r"^(?P<nums>\d+[a-z]*(?:\.\d+){1,2})$")

#: The first component of a version: a number optionally followed by the scheme letter, so `3a` is
#: major number 3 on scheme `a`. The letter is never interpreted, only carried through.
_HEAD = re.compile(r"^(?P<number>\d+)(?P<scheme>[a-z]*)$")


class VersioningError(ValueError):
    """Raised when a repository's versioning configuration cannot be honoured."""


def load_config(repo_root: str) -> Dict[str, object]:
    """Reads the versioning block from the repository manifest.

    Args:
        repo_root: Path to the repository root.

    Returns:
        The `versioning` object from `.darkfactory/manifest.json`, defaulted where absent.

    Raises:
        VersioningError: If the declared mode is not one this module implements.
    """
    try:
        from .resolver import load_config_block
    except ImportError:
        from resolver import load_config_block

    config: Dict[str, object] = dict(load_config_block(repo_root, "repo").get("versioning", {}))

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


def _parse(tag: str) -> Optional[Tuple[str, List[int]]]:
    """Turns a release tag or version into its scheme letter and its numbers.

    Args:
        tag: A tag name or bare version, with or without a leading `v`.

    Returns:
        The scheme letter (`""` when there is none) and the components padded to three, or `None`
        when the input is not a release version.
    """
    match = _VERSION.match(tag.strip().lstrip("v"))
    if not match:
        return None
    head, *rest = match.group("nums").split(".")
    first = _HEAD.match(head)
    if not first:  # pragma: no cover - unreachable while _VERSION requires this shape
        return None
    numbers = [int(first.group("number"))] + [int(part) for part in rest]
    while len(numbers) < 3:
        numbers.append(0)
    return first.group("scheme"), numbers


def _render(scheme: str, major: int, minor: int, patch: int) -> str:
    """Rebuilds a version from its scheme letter and numbers.

    Args:
        scheme: The scheme letter, or `""` for a plain numeric version.
        major: The most significant component.
        minor: The middle component.
        patch: The least significant component.

    Returns:
        The version string, e.g. `3a.2.0`.
    """
    return f"{major}{scheme}.{minor}.{patch}"


def bump_version(current: str, bump: Optional[str]) -> Optional[str]:
    """Applies a bump to a version without changing the scheme it is written in.

    A repository that versions itself `3a.1.0` gets `3a.2.0` and not `3.2.0`: the letter is part of
    the version, and nothing here decides what it means. A bump to the major component moves the
    number and keeps the letter, because a genuinely new scheme is a decision the `VERSION` file
    exists to record explicitly.

    Args:
        current: The version being bumped.
        bump: `"major"`, `"minor"`, or `"patch"`; `None` warrants no release.

    Returns:
        The bumped version, or `None` when nothing is warranted or `current` is unparseable.

    Raises:
        VersioningError: If the bump is not a size this module understands.
    """
    if bump is None:
        return None
    if bump not in BUMPS:
        raise VersioningError(f"unknown bump {bump!r}; expected one of {list(BUMPS)}")
    parsed = _parse(current)
    if parsed is None:
        return None
    scheme, numbers = parsed
    major, minor, patch = numbers
    if bump == "major":
        return _render(scheme, major + 1, 0, 0)
    if bump == "minor":
        return _render(scheme, major, minor + 1, 0)
    return _render(scheme, major, minor, patch + 1)


def is_ahead(candidate: Optional[str], current: Optional[str]) -> bool:
    """Reports whether a version is a deliberate step past the one already released.

    Both sides are compared within one scheme, so `3b.0.0` is ahead of `3a.9.9` and `3a.1.0` is not
    ahead of `3a.2.0`. A version in a different scheme than the current release cannot be compared
    numerically, and a declared version that names an unreleased scheme is a choice, not staleness.

    Args:
        candidate: The version being considered, or `None`.
        current: The last released version, or `None` when nothing has been released.

    Returns:
        `True` when `candidate` names something newer than `current`.
    """
    if not candidate:
        return False
    left = _parse(candidate)
    right = _parse(current) if current else None
    if left is None:
        return False
    if right is None:
        return True
    if left[0] != right[0]:
        return True
    return left[1] > right[1]


def latest_tag(tags: Sequence[str], prefer: Optional[str] = None) -> Optional[str]:
    """Picks the highest release tag from a list, ignoring anything that is not one.

    Args:
        tags: Candidate tag names.
        prefer: A scheme letter to narrow the candidates to, such as the `a` of a declared
            `3a.1.0`. Narrowing keeps a repository on the release line it says it is on instead of
            comparing it against a superseded scheme that happens to sort lower or higher.

    Returns:
        The highest tag, or `None` when the repository has never been released.
    """
    parsed = []
    for tag in tags:
        result = _parse(tag)
        if result is not None:
            parsed.append((result[1], result[0], tag))
    if not parsed:
        return None
    if prefer is not None:
        same_scheme = [entry for entry in parsed if entry[1] == prefer]
        if same_scheme:
            parsed = same_scheme
    numbers, scheme, tag = max(parsed, key=lambda entry: (entry[0], entry[1]))
    return tag


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
        parsed = _parse(current) if current else None
        numbers = parsed[1] if parsed else None
        if numbers and current and current.startswith(f"{stamp}."):
            return f"{stamp}.{numbers[2] + 1}"
        return f"{stamp}.0"

    parsed = _parse(current) if current else None
    major, minor, patch = parsed[1] if parsed else (0, 0, 0)

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
        A mapping with `mode`, `current`, `current_tag`, `next`, `tag` and `bump`. `next` is `None`
        when no release is warranted.

    Raises:
        VersioningError: If `manual` mode is selected but no `VERSION` file exists.
    """
    config = load_config(repo_root)
    mode = str(config["mode"])
    prefix = str(config["tag_prefix"])

    tags = git_tags(repo_root)
    declared = read_manual_version(repo_root)
    parsed_declared = _parse(declared) if declared else None
    # The declared version says which release line this repository is on, so the comparison is
    # narrowed to that line rather than weighed against a superseded scheme.
    prefer = parsed_declared[0] if parsed_declared else None
    current_tag = latest_tag(tags, prefer=prefer)
    current = None
    if current_tag:
        current = current_tag[len(prefix) :] if current_tag.startswith(prefix) else current_tag

    if mode == "manual":
        if declared is None:
            raise VersioningError(
                "manual versioning requires a VERSION file at the repository root"
            )
        if is_ahead(declared, current):
            # The file names something newer than what is released: that is the owner's decision,
            # and it wins over anything the commit log implies.
            return {
                "mode": mode,
                "current": current,
                "current_tag": current_tag,
                "next": declared,
                "tag": f"{prefix}{declared}",
                "bump": "declared",
            }
        # Either the file already matches the last release, or it names one that is behind it
        # because a record never landed. A stale file is not a choice: treating it as one would
        # re-release an old number, so the pipeline advances from the last release instead.
        bump = classify_commits(commits_since(repo_root, current_tag))
        upcoming = bump_version(current, bump) if current else None
        return {
            "mode": mode,
            "current": current,
            "current_tag": current_tag,
            "next": upcoming,
            "tag": f"{prefix}{upcoming}" if upcoming else None,
            "bump": bump,
        }

    bump: Optional[str]
    if requested and _parse(requested):
        upcoming = requested.lstrip("v")
        return {
            "mode": mode,
            "current": current,
            "current_tag": current_tag,
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
        "current_tag": current_tag,
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
