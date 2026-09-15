"""Assembles a release: the version, the notes, the assets, and the metadata check.

On merge to `main` the pipeline decides whether a release is warranted, what it is called, what
goes in it, and whether the repository's own manifests agree with that answer. Each of those is a
separate question, so each is a separate function here and the workflow only sequences them.

Asset collection supports both halves of the same idea as everything else in this pipeline:
`environment.build_plan()` derives what to build from what is actually in the repository, and the
manifest's `release.assets` adds anything bespoke. A repository with no build - a template, a
documentation site - produces a tagged release with no assets rather than a failure.
"""

import glob
import json
import os
import re
from typing import Any, Dict, Iterable, List, Optional, Tuple

import environment
import manifest as manifest_module
import versioning

#: Conventional Commit type -> the heading it appears under in the release notes, in order.
NOTE_SECTIONS: Tuple[Tuple[str, str], ...] = (
    ("feat", "Features"),
    ("fix", "Fixes"),
    ("perf", "Performance"),
    ("refactor", "Refactoring"),
    ("docs", "Documentation"),
    ("test", "Tests"),
    ("ci", "Pipeline"),
    ("chore", "Maintenance"),
)

#: `type(scope)!: subject`
_COMMIT = re.compile(r"^(?P<type>[a-z]+)(?:\((?P<scope>[^)]*)\))?(?P<bang>!)?:\s*(?P<subject>.+)$")


class ReleaseError(RuntimeError):
    """Raised when a release cannot be assembled as configured."""


def build_notes(messages: Iterable[str], version: str, previous: Optional[str]) -> str:
    """Groups Conventional Commits into release notes.

    Args:
        messages: Full commit messages since the previous release, newest first.
        version: The version being released.
        previous: The previous version, or `None` for a first release.

    Returns:
        Markdown release notes. Sections with no commits are omitted entirely.
    """
    grouped: Dict[str, List[str]] = {key: [] for key, _heading in NOTE_SECTIONS}
    breaking: List[str] = []

    for message in messages:
        header = message.splitlines()[0] if message else ""
        match = _COMMIT.match(header.strip())
        if not match:
            continue
        scope = match.group("scope")
        subject = match.group("subject").strip()
        entry = f"**{scope}**: {subject}" if scope else subject
        if match.group("bang") or re.search(r"^BREAKING[ -]CHANGE:", message, re.MULTILINE):
            breaking.append(entry)
        commit_type = match.group("type")
        if commit_type in grouped:
            grouped[commit_type].append(entry)

    lines: List[str] = []
    if breaking:
        lines.append("### Breaking changes")
        lines.extend(f"- {entry}" for entry in breaking)
        lines.append("")
    for key, heading in NOTE_SECTIONS:
        if grouped[key]:
            lines.append(f"### {heading}")
            lines.extend(f"- {entry}" for entry in grouped[key])
            lines.append("")

    if not lines:
        lines = ["No user-facing changes recorded.", ""]

    if previous:
        lines.append(f"Changes since `{previous}`.")
    else:
        lines.append("First release.")
    return "\n".join(lines).strip() + "\n"


def declared_assets(root: str) -> List[Dict[str, str]]:
    """Reads bespoke asset definitions from the manifest.

    Args:
        root: Repository root.

    Returns:
        A list of `{"command": ..., "path": ...}` entries; `command` may be absent.
    """
    loaded = manifest_module.load(root)
    entries = (loaded.data.get("release", {}) or {}).get("assets", []) or []
    resolved: List[Dict[str, str]] = []
    for entry in entries:
        if isinstance(entry, str):
            resolved.append({"path": entry})
        elif isinstance(entry, dict) and entry.get("path"):
            resolved.append(
                {
                    "path": str(entry["path"]),
                    **({"command": str(entry["command"])} if entry.get("command") else {}),
                }
            )
    return resolved


def plan_assets(root: str) -> List[Dict[str, Any]]:
    """Builds the complete list of build steps and artifact globs for a release.

    Detection and declaration compose: everything `environment` found is built with its
    ecosystem's command, and anything declared in the manifest is appended.

    Args:
        root: Repository root.

    Returns:
        Steps as `{"command": ..., "globs": [...], "cwd": ...}`.
    """
    env = environment.configure(root)
    steps: List[Dict[str, Any]] = []

    for ecosystem, entry in env.build_plan().items():
        packages = env.packages_for(ecosystem)
        # A workspace root builds its members, so building each member as well duplicates work.
        roots = [p for p in packages if p.is_workspace_root] or packages
        for package in roots:
            steps.append(
                {
                    "command": entry["command"],
                    "cwd": package.path,
                    "globs": list(entry.get("artifacts", [])),
                    "ecosystem": ecosystem,
                }
            )

    for entry in declared_assets(root):
        steps.append(
            {
                "command": entry.get("command"),
                "cwd": ".",
                "globs": [entry["path"]],
                "ecosystem": "declared",
            }
        )
    return steps


def collect_assets(root: str, steps: Iterable[Dict[str, Any]]) -> List[str]:
    """Resolves the artifact globs produced by a set of build steps.

    Args:
        root: Repository root.
        steps: Steps from :func:`plan_assets`.

    Returns:
        Existing file paths, relative to the repository root, deduplicated and sorted.
    """
    found: List[str] = []
    for step in steps:
        base = os.path.join(root, step.get("cwd", "."))
        for pattern in step.get("globs", []):
            for match in glob.glob(os.path.join(base, pattern), recursive=True):
                if os.path.isfile(match):
                    found.append(os.path.relpath(match, root))
    return sorted(set(found))


def check_metadata(root: str, version: str) -> List[str]:
    """Verifies every package manifest agrees with the version being released.

    A monorepo carries the same version in several files, and nothing keeps them in step. A
    release that tags `1.4.0` while `packages/cli/package.json` still says `1.3.9` publishes an
    artifact whose own metadata contradicts its tag.

    Args:
        root: Repository root.
        version: The version being released.

    Returns:
        Human-readable descriptions of each disagreement. Empty means conformant.
    """
    loaded = manifest_module.load(root)
    policy = (loaded.data.get("release", {}) or {}).get("metadata", "warn")
    if policy == "ignore":
        return []

    env = environment.configure(root)
    problems: List[str] = []
    for package in env.packages:
        if package.version is None:
            continue
        if package.version != version:
            problems.append(
                f"{package.manifest} declares version {package.version!r}, "
                f"but the release is {version!r}"
            )
    return problems


def sync_metadata(root: str, version: str) -> List[str]:
    """Rewrites each package manifest's version in place.

    Only the version field is touched, and only in formats where it can be replaced without
    reserialising the document - reformatting a manifest as a side effect of a release is a
    diff nobody asked for.

    Args:
        root: Repository root.
        version: The version to write.

    Returns:
        The manifests that were changed.
    """
    env = environment.configure(root)
    changed: List[str] = []
    for package in env.packages:
        if package.version is None or package.version == version:
            continue
        path = os.path.join(root, package.manifest)
        try:
            with open(path, encoding="utf-8") as handle:
                content = handle.read()
        except OSError:
            continue

        if package.manifest.endswith(".json"):
            updated = re.sub(
                r'("version"\s*:\s*)"[^"]*"', lambda m: f'{m.group(1)}"{version}"', content, count=1
            )
        else:
            updated = re.sub(
                r'(?m)^(version\s*=\s*)"[^"]*"',
                lambda m: f'{m.group(1)}"{version}"',
                content,
                count=1,
            )

        if updated != content:
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(updated)
            changed.append(package.manifest)
    return changed


def resolve_release(root: str, requested: Optional[str] = None) -> Dict[str, Any]:
    """Decides everything about the next release without performing it.

    Args:
        root: Repository root.
        requested: An explicit bump or exact version requested by a human.

    Returns:
        A mapping with `version`, `tag`, `mode`, `bump`, `previous`, `notes`, `steps` and
        `metadata_problems`. `version` is `None` when no release is warranted.
    """
    decision = versioning.resolve(root, requested)
    version = decision["next"]
    if not version:
        return {
            "version": None,
            "tag": None,
            "mode": decision["mode"],
            "bump": decision["bump"],
            "previous": decision["current"],
            "notes": "",
            "steps": [],
            "metadata_problems": [],
        }

    tags = versioning.git_tags(root)
    previous_tag = versioning.latest_tag(tags)
    messages = versioning.commits_since(root, previous_tag)

    return {
        "version": version,
        "tag": decision["tag"],
        "mode": decision["mode"],
        "bump": decision["bump"],
        "previous": decision["current"],
        "notes": build_notes(messages, version, decision["current"]),
        "steps": plan_assets(root),
        "metadata_problems": check_metadata(root, version),
    }


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Prints the resolved release as JSON, or applies the metadata sync."""
    import argparse

    parser = argparse.ArgumentParser(description="Resolve the next release.")
    parser.add_argument("--repo-root", default=".", help="repository to inspect")
    parser.add_argument(
        "--bump",
        default=os.environ.get("REQUESTED_BUMP") or None,
        help="explicit bump: patch, minor, major, proud, or an exact version",
    )
    parser.add_argument(
        "--sync-metadata",
        action="store_true",
        help="rewrite every package manifest's version to match the release",
    )
    parser.add_argument("--notes-out", help="write the release notes to this file")
    args = parser.parse_args()

    resolved = resolve_release(args.repo_root, args.bump)

    if args.sync_metadata and resolved["version"]:
        resolved["metadata_synced"] = sync_metadata(args.repo_root, resolved["version"])
        resolved["metadata_problems"] = check_metadata(args.repo_root, resolved["version"])

    if args.notes_out and resolved["notes"]:
        with open(args.notes_out, "w", encoding="utf-8") as handle:
            handle.write(resolved["notes"])

    print(json.dumps(resolved, indent=2))


if __name__ == "__main__":  # pragma: no cover
    main()
