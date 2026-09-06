"""MkDocs hook that publishes the repository's canonical markdown without duplicating it.

`AGENTS.md` rule 2 forbids storing a static documentation mirror. The canonical documents live at
the repository root (`README.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `AGENTS.md`, `VISION.md`) and
under `notes/`; committing copies of them under `docs/` would create two sources of truth that drift.

This hook maps each canonical file to a virtual page in the MkDocs file tree at build time, so the
site is generated from the originals and `docs/` stays empty of duplicated prose. Inter-document
links written for GitHub (``ARCHITECTURE.md``) are rewritten to their site paths so
``mkdocs build --strict`` reports no broken links.
"""

import os
import re
from typing import Any, Dict, List, Optional, Tuple

from mkdocs.structure.files import File, Files

#: (source path relative to the repository root, destination path inside the site).
PUBLISHED_PAGES: List[Tuple[str, str]] = [
    ("README.md", "index.md"),
    ("ARCHITECTURE.md", "architecture.md"),
    ("ROADMAP.md", "roadmap.md"),
    ("AGENTS.md", "agents.md"),
    ("VISION.md", "vision.md"),
    ("notes/architecture_decisions.md", "notes/architecture_decisions.md"),
    ("notes/vision_capture.md", "notes/vision_capture.md"),
    ("notes/bootstrap.md", "notes/bootstrap.md"),
]

#: Repository-relative markdown targets rewritten to their published counterparts.
LINK_REWRITES: Dict[str, str] = {
    "README.md": "index.md",
    "ARCHITECTURE.md": "architecture.md",
    "ROADMAP.md": "roadmap.md",
    "AGENTS.md": "agents.md",
    "VISION.md": "vision.md",
    "CONTRIBUTING.md": "agents.md",
    "CLAUDE.md": "agents.md",
}

_LINK_PATTERN = re.compile(r"\]\((?!https?://)(?P<target>[^)\s#]+)(?P<anchor>#[^)]*)?\)")


def _repo_root(config: Any) -> str:
    """Resolves the repository root from the MkDocs configuration.

    Args:
        config: MkDocs configuration object or mapping.

    Returns:
        Absolute path to the repository root.
    """
    config_file = getattr(config, "config_file_path", None)
    if config_file is None and hasattr(config, "get"):
        config_file = config.get("config_file_path")
    if config_file:
        return os.path.dirname(os.path.abspath(config_file))
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _rewrite_links(markdown: str, dest_path: str) -> str:
    """Rewrites repository-relative links so they resolve inside the built site.

    Args:
        markdown: Source markdown.
        dest_path: Destination path of this page inside the site (e.g. ``notes/x.md``).

    Returns:
        Markdown with repository-relative links pointing at published pages.
    """
    depth = dest_path.count("/")
    prefix = "../" * depth

    def replace(match: "re.Match[str]") -> str:
        target = match.group("target")
        anchor = match.group("anchor") or ""
        normalized = target.lstrip("./")
        replacement = LINK_REWRITES.get(normalized)
        if replacement is None:
            return match.group(0)
        return f"]({prefix}{replacement}{anchor})"

    return _LINK_PATTERN.sub(replace, markdown)


def on_files(files: Files, config: Any) -> Files:
    """Injects the canonical repository documents as virtual pages.

    Args:
        files: The file collection MkDocs discovered under ``docs_dir``.
        config: MkDocs configuration.

    Returns:
        The augmented file collection.
    """
    root = _repo_root(config)
    docs_dir = getattr(config, "docs_dir", None) or config["docs_dir"]

    for source, dest in PUBLISHED_PAGES:
        source_path = os.path.join(root, source)
        if not os.path.isfile(source_path):
            continue

        existing: Optional[File] = files.get_file_from_path(dest)
        if existing is not None:
            files.remove(existing)

        with open(source_path, "r", encoding="utf-8") as handle:
            content = handle.read()

        files.append(File.generated(config, dest, content=_rewrite_links(content, dest)))

    # Keep `docs_dir` referenced so a missing directory surfaces as a configuration error rather
    # than a silently empty site.
    if not os.path.isdir(docs_dir):
        raise FileNotFoundError(f"docs_dir does not exist: {docs_dir}")

    return files
