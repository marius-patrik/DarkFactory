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
import subprocess
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
                    found.append(os.path.relpath(match, root).replace(os.sep, "/"))
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

    # The tag the decision was measured against, not a freshly recomputed one: measuring the notes
    # window against a different tag than the version decision used is how a release ends up
    # describing commits that are already published.
    messages = versioning.commits_since(root, decision.get("current_tag"))

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


def _git(root: str, *args: str) -> str:
    """Runs one git command in the repository and returns its output.

    Args:
        root: Repository root.
        *args: Arguments passed to `git`.

    Returns:
        The command's standard output, stripped.

    Raises:
        ReleaseError: If git fails, with its error output attached.
    """
    result = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise ReleaseError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def _gh(root: str, *args: str) -> str:
    """Runs one GitHub CLI command and returns its output.

    Args:
        root: Repository root, used as the working directory.
        *args: Arguments passed to `gh`.

    Returns:
        The command's standard output, stripped.

    Raises:
        ReleaseError: If the command fails, with its error output attached.
    """
    result = subprocess.run(["gh", *args], cwd=root, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        raise ReleaseError(f"gh {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout.strip()


def record_version(root: str, version: str, released_tag: Optional[str] = None) -> Dict[str, Any]:
    """Records a released version on a delivery branch for the development branch.

    The `VERSION` file is the owner's control over the next number, which only works while it is
    also a record of the last one. A file that still names an already-released version reads as an
    explicit choice of that version, and the next promotion tries to release it again. So the
    release job writes what it actually released onto its own branch and opens the governed pull
    request against the development branch; it never pushes to a protected branch itself.

    Recording the same version twice is a no-op, so a re-run after a completed release neither
    commits again nor asks for a second review. The pull request binds `release.record_issue`,
    because every pull request to `develop` has to name a tracking issue to pass its required check;
    without one the version is still committed and the omission is reported rather than opening a
    request that can only sit at `REVIEW_REQUIRED`.

    Args:
        root: Repository root.
        version: The version that was released.
        released_tag: The tag that was published, quoted in the pull request body.

    Returns:
        `{"recorded": bool, "version": str, "branch": str | None, "base": str, "issue": int | None,
        "pull_request": str | None, "reason": str | None}`.

    Raises:
        ReleaseError: If the repository declares no development branch, or git fails.
    """
    loaded = manifest_module.load(root)
    base = loaded.development_branch
    if not base:
        raise ReleaseError(
            "recording a release needs repo.identity.development_branch in the manifest"
        )

    declared = versioning.read_manual_version(root)
    issue = (loaded.data.get("release", {}) or {}).get("record_issue")
    result: Dict[str, Any] = {
        "recorded": False,
        "version": version,
        "branch": None,
        "base": base,
        "issue": issue,
        "pull_request": None,
        "reason": None,
    }
    if declared == version:
        result["reason"] = f"VERSION already records {version}"
        return result

    branch = f"release/record-{version}"
    _git(root, "fetch", "origin", base)
    _git(root, "checkout", "-B", branch, f"origin/{base}")
    with open(os.path.join(root, "VERSION"), "w", encoding="utf-8") as handle:
        handle.write(f"{version}\n")
    _git(root, "add", "VERSION")
    _git(root, "commit", "-q", "-m", f"chore(release): record {version}")
    _git(root, "push", "--force-with-lease", "origin", f"{branch}:{branch}")
    result["recorded"] = True
    result["branch"] = branch

    if not issue:
        result["reason"] = (
            "no release.record_issue in the manifest, so no pull request was opened; "
            f"{version} is committed on {branch}"
        )
        return result

    open_prs = _gh(
        root,
        "pr",
        "list",
        "--head",
        branch,
        "--state",
        "open",
        "--json",
        "number",
        "--jq",
        "[.[].number]",
    )
    if open_prs.strip() not in {"", "[]"}:
        result["pull_request"] = open_prs.strip()
        result["reason"] = f"a pull request for {branch} is already open"
        return result

    body = "\n".join(
        [
            "## Summary",
            "",
            f"The release job published `{released_tag or version}` and this records it in `VERSION`.",
            "",
            "Without this the file keeps naming an already-released version, which the resolver",
            "reads as an explicit choice of that version, so the next promotion would try to",
            "release it again.",
            "",
            f"- Released: `{released_tag or version}`",
            f"- Base: `{base}`",
            "- One file: `VERSION`",
            "",
            "## Bound Request(s)",
            "",
            f"- Advances #{issue}",
            "",
        ]
    )
    result["pull_request"] = _gh(
        root,
        "pr",
        "create",
        "--base",
        base,
        "--head",
        branch,
        "--title",
        f"chore(release): record {version}",
        "--body",
        body,
    )
    return result


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
    parser.add_argument(
        "--record-version",
        metavar="VERSION",
        help="record an already-released version on a delivery branch for the development branch",
    )
    parser.add_argument(
        "--released-tag",
        metavar="TAG",
        help="the tag published alongside --record-version, quoted in the pull request",
    )
    parser.add_argument("--notes-out", help="write the release notes to this file")
    args = parser.parse_args()

    if args.record_version:
        print(
            json.dumps(
                record_version(args.repo_root, args.record_version, args.released_tag), indent=2
            )
        )
        return

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
