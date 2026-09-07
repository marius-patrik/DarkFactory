"""Writes the manifest the documentation site's version switcher reads.

The site holds several builds at once on the `gh-pages` branch: the current documentation at the
root, a preview per open pull request under `pr-<N>/`, and a build per tracked branch under
`branch/<name>/`. Which of those exist changes whenever a pull request opens or closes, so the
switcher fetches this file at read time rather than having the list baked into every page - a page
built last week would otherwise offer previews that have since been torn down.

The list is derived from what is actually on the branch, not from what the workflow believes it
published, so a preview removed by hand disappears from the switcher on the next deploy.

Cross-project entries come from the manifest, so a reader can move from any consumer's site to the
shared pipeline's documentation without knowing its URL.
"""

import argparse
import json
import os
import re
from typing import Any, Dict, List, Optional

#: Directory prefix holding per-pull-request previews.
PREVIEW_PREFIX = "pr-"

#: Directory holding per-branch builds.
BRANCH_PREFIX = "branch"

#: Filename the switcher fetches from the site root.
MANIFEST_NAME = "versions.json"

_PREVIEW = re.compile(r"^pr-(\d+)$")


def discover(site_root: str, current_label: str) -> List[Dict[str, str]]:
    """Lists every build present on the published site.

    Args:
        site_root: Directory holding the published site, i.e. a `gh-pages` checkout.
        current_label: Name to give the build at the site root.

    Returns:
        Entries carrying `name` and `path`, the root build first, then branches, then previews in
        descending pull-request order so the newest is nearest the top.
    """
    entries: List[Dict[str, str]] = [{"name": current_label, "path": ""}]

    branch_dir = os.path.join(site_root, BRANCH_PREFIX)
    if os.path.isdir(branch_dir):
        for name in sorted(os.listdir(branch_dir)):
            if os.path.isdir(os.path.join(branch_dir, name)):
                entries.append({"name": name, "path": f"{BRANCH_PREFIX}/{name}"})

    previews: List[tuple] = []
    if os.path.isdir(site_root):
        for name in os.listdir(site_root):
            match = _PREVIEW.match(name)
            if match and os.path.isdir(os.path.join(site_root, name)):
                previews.append((int(match.group(1)), name))
    for number, name in sorted(previews, reverse=True):
        entries.append({"name": f"PR #{number}", "path": name})

    return entries


def projects(repo_root: str) -> List[Dict[str, str]]:
    """Reads the sibling documentation sites to offer.

    Args:
        repo_root: Repository root, holding `.github/darkfactory.json`.

    Returns:
        Entries carrying `name` and an absolute `url`. Empty when none are declared.
    """
    path = os.path.join(repo_root, ".github", "darkfactory.json")
    if not os.path.isfile(path):
        return []
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        return []
    declared = (data.get("documentation", {}) or {}).get("projects", []) or []
    resolved: List[Dict[str, str]] = []
    for entry in declared:
        if isinstance(entry, dict) and entry.get("name") and entry.get("url"):
            resolved.append({"name": str(entry["name"]), "url": str(entry["url"])})
    return resolved


def build(
    site_root: str, repo_root: str, current_label: str, current_path: str = ""
) -> Dict[str, Any]:
    """Assembles the switcher manifest.

    Args:
        site_root: Directory holding the published site.
        repo_root: Repository root, for the declared sibling projects.
        current_label: Name to give the build at the site root.
        current_path: Path of the build being viewed, empty for the root.

    Returns:
        The manifest, ready to serialise.
    """
    return {
        "current": current_path,
        "versions": discover(site_root, current_label),
        "projects": projects(repo_root),
    }


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Writes the manifest into the published site."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site-root", required=True, help="a gh-pages checkout")
    parser.add_argument("--repo-root", default=".", help="repository holding the manifest")
    parser.add_argument("--current", default="main", help="name for the build at the site root")
    parser.add_argument("--out", help="where to write it (default: <site-root>/versions.json)")
    args = parser.parse_args()

    manifest = build(args.site_root, args.repo_root, args.current)
    destination = args.out or os.path.join(args.site_root, MANIFEST_NAME)
    os.makedirs(os.path.dirname(destination) or ".", exist_ok=True)
    with open(destination, "w", encoding="utf-8") as handle:
        json.dump(manifest, handle, indent=2)
        handle.write("\n")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":  # pragma: no cover
    main()
