"""Reads the per-repository manifest that the shared pipeline is configured by.

Every workflow and script in `.github/` is distributed byte-for-byte to each repository that uses
this pipeline. Anything that differs between them - the owner and repository name, the project
board, the area taxonomy, the versioning mode - lives in `.github/darkfactory.json` instead of being
hardcoded, so an update to the pipeline is a fast-forward rather than a merge conflict.

Keys are read with defaults throughout: a repository that declares nothing still gets a working
pipeline, and a key added here later does not break repositories that have not adopted it yet.
"""

import json
import os
from typing import Any, Dict, List, Optional, Sequence, Tuple

#: Manifest location, relative to the repository root.
MANIFEST_PATH = os.path.join(".github", "darkfactory.json")

#: Area labels used when a repository declares none. Deliberately about the pipeline itself, since
#: that is the only domain a repository is guaranteed to have.
DEFAULT_AREAS: Dict[str, str] = {
    "ci": "GitHub Actions workflows, containers, runner scripts, repository automation",
    "agents": "Harness orchestration, provider adapters, personas, approvals",
    "docs": "Documentation site, theme, architecture notes",
}

#: Status checks required when a repository declares none. Only jobs that always report a
#: conclusion belong here; a job that can be skipped blocks every merge forever.
DEFAULT_REQUIRED_CHECKS: Tuple[str, ...] = (
    "pipeline (3.10)",
    "pipeline (3.11)",
    "pipeline (3.12)",
    "pipeline (3.13)",
    "rust",
    "paper",
    "math",
    "web",
    "docs",
    "verify-bound-issue",
)

#: Colours cycled through when assigning one to an area label that has no explicit colour.
AREA_COLOURS: Tuple[str, ...] = (
    "5319e7",
    "1f883d",
    "0052cc",
    "a2eeef",
    "f9d0c4",
    "c2e0c6",
    "e99695",
    "006b75",
    "0075ca",
)


class Manifest:
    """The parsed contents of a repository's `darkfactory.json`.

    Attributes:
        root: Absolute path to the repository root.
        data: The raw parsed document.
    """

    def __init__(self, root: str, data: Dict[str, Any]) -> None:
        self.root = root
        self.data = data

    # -- identity ---------------------------------------------------------------------------

    @property
    def owner(self) -> str:
        """Returns the account owning the repository.

        Returns:
            The owner login, falling back to the `GITHUB_REPOSITORY` environment variable.
        """
        declared = self._identity.get("owner")
        if declared:
            return str(declared)
        return (os.environ.get("GITHUB_REPOSITORY", "/").split("/") + [""])[0]

    @property
    def repo(self) -> str:
        """Returns the repository name.

        Returns:
            The repository name, falling back to `GITHUB_REPOSITORY`, then the directory name.
        """
        declared = self._identity.get("repo")
        if declared:
            return str(declared)
        env = os.environ.get("GITHUB_REPOSITORY", "")
        if "/" in env:
            return env.split("/", 1)[1]
        return os.path.basename(self.root)

    @property
    def slug(self) -> str:
        """Returns the `owner/repo` slug.

        Returns:
            The full repository slug.
        """
        return f"{self.owner}/{self.repo}"

    @property
    def display_name(self) -> str:
        """Returns the human-facing project name.

        Returns:
            The declared display name, defaulting to the repository name.
        """
        return str(self._identity.get("display_name") or self.repo)

    @property
    def project_title(self) -> str:
        """Returns the title of this repository's project board.

        Returns:
            The declared board title, defaulting to the display name.
        """
        return str(self._identity.get("project_title") or self.display_name)

    @property
    def default_branch(self) -> str:
        """Returns the branch protection and the pipeline's own triggers apply to.

        DarkFactory's default branch is named after the repository rather than `main`, so a
        consumer that adds it as a remote gets a `darkfactory` branch without renaming anything.

        Returns:
            The declared default branch, or `main`.
        """
        return str(self._identity.get("default_branch") or "main")

    @property
    def agent_slug(self) -> str:
        """Returns the marker used to recognise this pipeline's own comments.

        Returns:
            A slug such as `darkfactory-agent`, used in HTML comment markers so the agent can
            identify and ignore its own output.
        """
        declared = self._identity.get("agent_slug")
        return str(declared) if declared else f"{self.repo.lower()}-agent"

    @property
    def description(self) -> str:
        """Returns the repository description.

        Returns:
            The declared description, or an empty string.
        """
        return str(self._identity.get("description") or "")

    @property
    def homepage(self) -> str:
        """Returns the documentation site URL.

        Returns:
            The GitHub Pages URL for this repository.
        """
        return f"https://{self.owner}.github.io/{self.repo}/"

    @property
    def license(self) -> Dict[str, str]:
        """Returns the declared licence.

        A licence is configuration rather than content: chosen once, identical for everyone who
        chooses it, and wrong in a legal sense rather than a stylistic one if it drifts. Declaring
        it here lets the file be written from canonical text instead of pasted in and forgotten.

        Returns:
            Mapping with `spdx`, `holder` and `year`; `spdx` is `"NONE"` when none is declared.
        """
        block = self.data.get("license", {}) or {}
        return {
            "spdx": str(block.get("spdx", "NONE")),
            "holder": str(block.get("holder", "")),
            "year": str(block.get("year", "")),
        }

    @property
    def topics(self) -> List[str]:
        """Returns the repository topics.

        Returns:
            Declared topics, or an empty list.
        """
        return [str(topic) for topic in self._identity.get("topics", [])]

    @property
    def _identity(self) -> Dict[str, Any]:
        """Returns the identity block.

        Returns:
            The `identity` object, or an empty mapping.
        """
        return self.data.get("identity", {}) or {}

    # -- areas ------------------------------------------------------------------------------

    @property
    def _raw_areas(self) -> Dict[str, Any]:
        """Returns the declared area block with comment keys stripped.

        Returns:
            Mapping of area name to either a description string or a settings object.
        """
        declared = {
            key: value
            for key, value in (self.data.get("areas", {}) or {}).items()
            if not key.startswith("$")
        }
        return declared or dict(DEFAULT_AREAS)

    @property
    def areas(self) -> Dict[str, str]:
        """Returns the area taxonomy: scope name to description.

        The same list drives area labels, Conventional Commit scopes, and the agent's routing, so
        the three cannot disagree. An area may be declared as a plain description string, or as an
        object carrying a description and the keywords that route a request to it.

        Returns:
            Mapping of bare area name (no `area:` prefix) to its description.
        """
        resolved: Dict[str, str] = {}
        for key, value in self._raw_areas.items():
            if isinstance(value, dict):
                resolved[key] = str(value.get("description", ""))
            else:
                resolved[key] = str(value)
        return resolved

    @property
    def area_keywords(self) -> Dict[str, List[str]]:
        """Returns the words that route a request to each area.

        Ordering is significant and follows declaration order: the first area whose keywords match
        wins, so more specific areas must be declared before more general ones.

        Returns:
            Mapping of bare area name to its keyword list. Areas that declare none fall back to
            their own name, so a bare taxonomy still classifies something.
        """
        resolved: Dict[str, List[str]] = {}
        for key, value in self._raw_areas.items():
            if isinstance(value, dict) and value.get("keywords"):
                resolved[key] = [str(word) for word in value["keywords"]]
            else:
                resolved[key] = [key]
        return resolved

    @property
    def default_area(self) -> str:
        """Returns the area a request falls back to when nothing matches.

        Returns:
            The declared fallback, or the last area in declaration order.
        """
        declared = (self.data.get("areas", {}) or {}).get("$default")
        if declared:
            return str(declared)
        names = list(self.areas)
        return names[-1] if names else "ci"

    @property
    def area_labels(self) -> List[Tuple[str, str, str]]:
        """Returns the area labels as `(name, colour, description)` triples.

        Returns:
            One triple per declared area, prefixed with `area:`.
        """
        labels: List[Tuple[str, str, str]] = []
        for index, (name, description) in enumerate(sorted(self.areas.items())):
            labels.append((f"area:{name}", AREA_COLOURS[index % len(AREA_COLOURS)], description))
        return labels

    @property
    def area_scopes(self) -> List[str]:
        """Returns the permitted Conventional Commit scopes.

        Returns:
            Bare area names, sorted.
        """
        return sorted(self.areas)

    # -- app ----------------------------------------------------------------------------------

    @property
    def app(self) -> Dict[str, Any]:
        """Returns the pipeline's GitHub App identity.

        The app id and client id are public identifiers; only the private key is a secret, and it
        lives in a repository secret named by `private_key_secret`.

        A GitHub App cannot write user-owned Projects v2 - GitHub scopes project permissions to
        organizations - so board work continues to use a personal access token until these
        repositories move under one. That is a GitHub limitation, not a configuration gap.

        Returns:
            The `app` block, or an empty mapping when no App is configured.
        """
        declared = dict(self.data.get("app", {}) or {})
        declared.pop("$comment", None)
        return declared

    # -- required checks --------------------------------------------------------------------

    @property
    def required_checks(self) -> List[str]:
        """Returns the status checks that must pass before a merge.

        Calling a reusable workflow prefixes every check name with the *caller's* job name, so a
        consumer's checks are `<caller job> / <called job>` rather than the bare names this
        repository produces. That renaming is invisible until branch protection starts blocking
        every merge against contexts nothing reports, so the list is declared per repository.

        Returns:
            Declared contexts, or this repository's own defaults.
        """
        declared = self.data.get("required_checks")
        if declared:
            return [str(entry) for entry in declared]
        return list(DEFAULT_REQUIRED_CHECKS)

    # -- board ------------------------------------------------------------------------------

    @property
    def global_board_title(self) -> Optional[str]:
        """Returns the title of the board aggregating every repository, if any.

        Returns:
            The board title, or `None` when no global board is used.
        """
        declared = (self.data.get("board", {}) or {}).get("global_title")
        return str(declared) if declared else None

    @property
    def linked_boards(self) -> List[str]:
        """Returns the boards that should appear in this repository's Projects tab.

        Returns:
            Board titles, always including this repository's own board.
        """
        declared = [
            str(title) for title in (self.data.get("board", {}) or {}).get("link_boards", [])
        ]
        if self.project_title not in declared:
            declared.append(self.project_title)
        return declared

    # -- pages ------------------------------------------------------------------------------

    @property
    def pages(self) -> Dict[str, Any]:
        """Returns the GitHub Pages source configuration.

        Returns:
            A mapping with `build_type`, and `branch`/`path` when the source is a branch.
        """
        declared = dict(self.data.get("pages", {}) or {})
        declared.pop("$comment", None)
        if not declared:
            return {"build_type": "workflow"}
        return declared

    def pages_payload(self) -> Dict[str, Any]:
        """Builds the request body the Pages API expects.

        Returns:
            A payload suitable for `POST`/`PUT` on `repos/{slug}/pages`.
        """
        pages = self.pages
        if pages.get("build_type") == "legacy":
            return {
                "build_type": "legacy",
                "source": {
                    "branch": pages.get("branch", "gh-pages"),
                    "path": pages.get("path", "/"),
                },
            }
        return {"build_type": pages.get("build_type", "workflow")}

    # -- upstream ---------------------------------------------------------------------------

    @property
    def upstream(self) -> Dict[str, Optional[str]]:
        """Returns the pinned pipeline upstream.

        Returns:
            A mapping with `repo` and `ref`. Both are `None` in the repository that *is* the
            upstream.
        """
        declared = dict(self.data.get("upstream", {}) or {})
        declared.pop("$comment", None)
        return {
            "repo": declared.get("repo"),
            "ref": declared.get("ref"),
        }

    @property
    def is_upstream(self) -> bool:
        """Reports whether this repository is the pipeline's source of truth.

        Returns:
            True when no upstream is pinned.
        """
        return not self.upstream["repo"]


def load(root: str = ".") -> Manifest:
    """Loads a repository's manifest.

    Args:
        root: Path to the repository root.

    Returns:
        The manifest, with defaults applied when the file is absent or unreadable.
    """
    root = os.path.abspath(root)
    path = os.path.join(root, MANIFEST_PATH)
    data: Dict[str, Any] = {}
    if os.path.isfile(path):
        try:
            with open(path, encoding="utf-8") as handle:
                loaded = json.load(handle)
            if isinstance(loaded, dict):
                data = loaded
        except (OSError, ValueError):
            data = {}
    return Manifest(root=root, data=data)


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Prints the resolved manifest identity as JSON."""
    import argparse

    parser = argparse.ArgumentParser(description="Report the resolved repository manifest.")
    parser.add_argument("--repo-root", default=".", help="repository to inspect")
    args = parser.parse_args()
    loaded = load(args.repo_root)
    print(
        json.dumps(
            {
                "slug": loaded.slug,
                "display_name": loaded.display_name,
                "project_title": loaded.project_title,
                "agent_slug": loaded.agent_slug,
                "homepage": loaded.homepage,
                "topics": loaded.topics,
                "areas": loaded.areas,
                "area_labels": loaded.area_labels,
                "linked_boards": loaded.linked_boards,
                "global_board": loaded.global_board_title,
                "pages": loaded.pages_payload(),
                "upstream": loaded.upstream,
                "is_upstream": loaded.is_upstream,
            },
            indent=2,
        )
    )


if __name__ == "__main__":  # pragma: no cover
    main()
