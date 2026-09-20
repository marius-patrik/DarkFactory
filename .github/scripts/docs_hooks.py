"""ProperDocs hooks that publish the repository's canonical markdown without duplicating it.

`.agents/rules/002-inline-docs-and-generated-documentation.md` forbids storing a static
documentation mirror and forbids a manually maintained index. The canonical documents live at the
repository root (`README.md`, `PRD.md`, `AGENTS.md`) and under `.agents/notes/`, with one file per
decision in `.agents/notes/adr/`. Committing a static documentation tree would create two sources
of truth that drift.

These hooks therefore:

- map each canonical file to a virtual page at build time, so the site is generated from the
  originals without a tracked documentation source directory;
- discover `.agents/notes/adr/*.md`, generate the decision index table from each record's title
  and status, and inject the navigation entries - so adding an ADR needs no configuration change;
- rewrite links written for GitHub (``PRD.md``) to their site paths, so
  ``properdocs build --strict`` reports no broken links.
"""

import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple

from properdocs.structure.files import File, Files

#: (source path relative to the repository root, destination path inside the site).
PUBLISHED_PAGES: List[Tuple[str, str]] = [
    ("README.md", "index.md"),
    ("PRD.md", "prd.md"),
    ("AGENTS.md", "agents.md"),
    (".agents/notes/adr/README.md", "architecture/decisions/process.md"),
]

#: Repository-relative markdown targets rewritten to their published counterparts.
LINK_REWRITES: Dict[str, str] = {
    "README.md": "index.md",
    "PRD.md": "prd.md",
    "AGENTS.md": "agents.md",
    "CONTRIBUTING.md": "agents.md",
    "CLAUDE.md": "agents.md",
    ".agents/notes/adr/README.md": "architecture/decisions/process.md",
    ".agents/notes/adr/": "architecture/decisions/index.md",
}

#: A repository may publish one reference file verbatim, wrapped in a code fence so the
#: documentation and the file can never disagree. It is declared by repo.df under
#: `documentation.declaration`; repositories that have none simply do not get the page.
DECLARATION_DEST = "declaration.md"


def _repo_df_path(root: str) -> Optional[str]:
    """Returns the active repo.df path, rejecting duplicate declarations."""
    under_darkfactory = os.path.join(root, ".darkfactory", "repo.df")
    at_root = os.path.join(root, "repo.df")
    present = [path for path in (under_darkfactory, at_root) if os.path.isfile(path)]
    if len(present) > 1:
        raise ValueError("Both .darkfactory/repo.df and repo.df exist; only one is allowed.")
    return present[0] if present else None


def _repository_declaration(root: str) -> Dict[str, Any]:
    """Loads the current repo.df declaration."""
    source = _repo_df_path(root)
    if source is None:
        return {}
    with open(source, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data if isinstance(data, dict) else {}


def _declaration_source(root: str) -> Optional[str]:
    """Returns the repository-relative reference file to publish verbatim, if any."""
    declared = (_repository_declaration(root).get("documentation", {}) or {}).get("declaration")
    return str(declared) if declared else None


#: Where ADR records live, and where they are published.
ADR_SOURCE_DIR = os.path.join(".agents", "notes", "adr")
ADR_DEST_PREFIX = "architecture/decisions"

_LINK_PATTERN = re.compile(r"\]\((?!https?://)(?P<target>[^)\s#]+)(?P<anchor>#[^)]*)?\)")
_TITLE_PATTERN = re.compile(r"^#\s+ADR-(?P<number>\d{4})\s+—\s+(?P<title>.+?)\s*$", re.M)
_STATUS_PATTERN = re.compile(r"\*\*Status\*\*:\s*(?P<status>[^·\n*]+)")
_RESOLVES_PATTERN = re.compile(r"\*\*(?:Resolves|Narrows)\*\*:\s*(?P<resolves>[^·\n]+)")


def _repo_root(config: Any) -> str:
    """Resolves the repository root from the ProperDocs configuration.

    Args:
        config: ProperDocs configuration object or mapping.

    Returns:
        Absolute path to the repository root.
    """
    config_file = getattr(config, "config_file_path", None)
    if config_file is None and hasattr(config, "get"):
        config_file = config.get("config_file_path")
    if config_file:
        return os.path.dirname(os.path.abspath(config_file))
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def discover_adrs(root: str) -> List[Dict[str, str]]:
    """Reads every ADR record and extracts what the index and navigation need.

    Args:
        root: Repository root.

    Returns:
        Records sorted by number, each with ``number``, ``title``, ``status``, ``resolves``,
        ``source`` (repository-relative), ``dest`` (site path) and ``slug``.

    Raises:
        ValueError: If a record has no parseable ``# ADR-NNNN - Title`` heading.
    """
    directory = os.path.join(root, ADR_SOURCE_DIR)
    if not os.path.isdir(directory):
        return []

    records: List[Dict[str, str]] = []
    for name in sorted(os.listdir(directory)):
        if not name.endswith(".md") or name in ("index.md", "README.md"):
            continue
        path = os.path.join(directory, name)
        with open(path, "r", encoding="utf-8") as handle:
            content = handle.read()

        title_match = _TITLE_PATTERN.search(content)
        if not title_match:
            raise ValueError(
                f"{ADR_SOURCE_DIR}/{name} has no '# ADR-NNNN - Title' heading; "
                f"the generated index cannot be built from it."
            )
        status_match = _STATUS_PATTERN.search(content)
        status = status_match.group("status").strip() if status_match else "Unknown"
        if status != "Accepted":
            raise ValueError(f"{ADR_SOURCE_DIR}/{name} must have Status: Accepted")
        resolves_match = _RESOLVES_PATTERN.search(content)

        records.append(
            {
                "number": title_match.group("number"),
                "title": title_match.group("title"),
                "status": status,
                "resolves": resolves_match.group("resolves").strip() if resolves_match else "",
                "source": f"{ADR_SOURCE_DIR}/{name}".replace(os.sep, "/"),
                "dest": f"{ADR_DEST_PREFIX}/{name[:-3]}.md",
                "slug": name[:-3],
            }
        )
    return sorted(records, key=lambda record: record["number"])


def render_adr_index(records: List[Dict[str, str]]) -> str:
    """Builds the decision index page from the discovered records.

    Args:
        records: Output of :func:`discover_adrs`.

    Returns:
        Markdown for the index page.
    """
    lines = [
        "# Architecture decisions",
        "",
        "Every decision that binds the implementation, one record per page. This index is generated",
        "from the files in `.agents/notes/adr/` at build time - it is never hand-maintained",
        "(`.agents/rules/002-inline-docs-and-generated-documentation.md`).",
        "",
        "See [the process](process.md) for when an ADR is required and how to write one.",
        "",
    ]
    if not records:
        return "\n".join(lines + ["*No decisions recorded yet.*", ""])

    lines += ["| # | Decision | Status | Resolves |", "|---|---|---|---|"]
    for record in records:
        resolves = record["resolves"] or "—"
        lines.append(
            f"| [{record['number']}]({record['slug']}.md) | "
            f"[{record['title']}]({record['slug']}.md) | {record['status']} | {resolves} |"
        )

    accepted = sum(1 for r in records if r["status"].lower().startswith("accepted"))
    lines += ["", f"{accepted} current accepted architecture decisions.", ""]
    return "\n".join(lines)


def _render_declaration_page(body: str, source: str) -> str:
    """Wraps the reference declaration in a page.

    Rendered from the file at build time rather than transcribed, so the documentation and the
    declaration it documents cannot disagree.

    Args:
        body: Contents of the reference declaration.
        source: Repository-relative declaration path.

    Returns:
        Markdown for the declaration page.
    """
    source_url = os.environ.get("DECLARATION_SOURCE_URL", "")
    return "\n".join(
        [
            "# The declaration",
            "",
            "The reference declaration, rendered from "
            f"[`{source}`]({source_url}) at build time — this page and the file cannot",
            "disagree.",
            "",
            "See [PRD §9](prd.md) for identity and security declarations, and why runtime changes",
            "are written back into them.",
            "",
            "```nix",
            body.rstrip("\n"),
            "```",
            "",
        ]
    )


def _rewrite_links(markdown: str, dest_path: str) -> str:
    """Rewrites repository-relative links so they resolve inside the built site.

    Args:
        markdown: Source markdown.
        dest_path: Destination path of this page inside the site.

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
            adr_match = re.fullmatch(r"\.agents/notes/adr/(?P<slug>[^/]+\.md)", normalized)
            if adr_match:
                replacement = f"{ADR_DEST_PREFIX}/{adr_match.group('slug')}"

        if replacement is None:
            return match.group(0)
        return f"]({prefix}{replacement}{anchor})"

    return _LINK_PATTERN.sub(replace, markdown)


def on_config(config: Any) -> Any:
    """Injects the Architecture section, including one entry per ADR, into ``nav``.

    Navigation is built here rather than declared in ``properdocs.yml`` so that adding a record to
    ``.agents/notes/adr/`` is the only step required to publish it.

    Args:
        config: ProperDocs configuration.

    Returns:
        The configuration with ``nav`` rewritten.
    """
    root = _repo_root(config)
    records = discover_adrs(root)

    decisions: List[Any] = [{"Overview": f"{ADR_DEST_PREFIX}/index.md"}]
    decisions += [
        {f"ADR-{record['number']} — {record['title']}": record["dest"]} for record in records
    ]
    decisions.append({"Process": f"{ADR_DEST_PREFIX}/process.md"})

    rules_dir = os.path.join(root, ".agents", "rules")
    rules_records: List[Dict[str, str]] = []
    if os.path.isdir(rules_dir):
        for name in sorted(os.listdir(rules_dir)):
            if not name.endswith(".md") or name in ("index.md", "README.md"):
                continue
            path = os.path.join(rules_dir, name)
            with open(path, "r", encoding="utf-8") as handle:
                c = handle.read()
            id_m = re.search(r"^id:\s*(.+)$", c, re.M)
            title_m = re.search(r"^title:\s*(.+)$", c, re.M)
            rule_id = id_m.group(1).strip() if id_m else name[:-3]
            rule_title = title_m.group(1).strip() if title_m else name[:-3]
            rules_records.append(
                {
                    "id": rule_id,
                    "title": rule_title,
                    "dest": f"rules/{name}",
                }
            )

    rules_nav: List[Any] = [{"Overview": "rules/index.md"}]
    rules_nav += [{f"{r['id']} — {r['title']}": r["dest"]} for r in rules_records]

    published = {
        dest for source, dest in PUBLISHED_PAGES if os.path.isfile(os.path.join(root, source))
    }
    published.update(record["dest"] for record in records)
    published.add(f"{ADR_DEST_PREFIX}/index.md")
    published.update(r["dest"] for r in rules_records)
    published.add("rules/index.md")
    published.add("reference/repository.md")
    published.add("reference/workflows.md")
    if _declaration_source(root):
        published.add(DECLARATION_DEST)

    def keep(entries: List[Any]) -> List[Any]:
        """Drops navigation entries whose page was never published.

        Repositories using this pipeline do not all carry the same documents, and a `nav` entry
        pointing at a page that does not exist fails `--strict`.

        Args:
            entries: Candidate navigation entries.

        Returns:
            The entries whose targets exist.
        """
        kept: List[Any] = []
        for entry in entries:
            ((title, target),) = entry.items()
            if isinstance(target, list):
                nested = keep(target)
                if nested:
                    kept.append({title: nested})
            elif target in published:
                kept.append(entry)
        return kept

    config["nav"] = keep(
        [
            {"Overview": "index.md"},
            {
                "Product": [
                    {"Requirements": "prd.md"},
                    {"Decisions": decisions},
                ]
            },
            {"Rules": rules_nav},
            {
                "Reference": [
                    {"Repository": "reference/repository.md"},
                    {"Workflows": "reference/workflows.md"},
                ]
            },
            {"The declaration": DECLARATION_DEST},
            {"Contributing & Agent Rules": "agents.md"},
            {"Notes": []},
        ]
    )
    return config


def on_files(files: Files, config: Any) -> Files:
    """Injects the canonical repository documents and every ADR as virtual pages.

    Args:
        files: The file collection ProperDocs discovered under ``docs_dir``.
        config: ProperDocs configuration.

    Returns:
        The augmented file collection.

    Raises:
        FileNotFoundError: If ``docs_dir`` is missing, which would otherwise yield a silently
            empty site.
    """
    root = _repo_root(config)
    docs_dir = getattr(config, "docs_dir", None) or config["docs_dir"]
    if not os.path.isdir(docs_dir):
        raise FileNotFoundError(f"docs_dir does not exist: {docs_dir}")

    records = discover_adrs(root)
    pages = list(PUBLISHED_PAGES) + [(r["source"], r["dest"]) for r in records]

    for source, dest in pages:
        existing: Optional[File] = files.get_file_from_path(dest)
        if existing is not None:
            continue

        source_path = os.path.join(root, source)
        if not os.path.isfile(source_path):
            continue

        with open(source_path, "r", encoding="utf-8") as handle:
            content = handle.read()

        files.append(File.generated(config, dest, content=_rewrite_links(content, dest)))

    source = _declaration_source(root)
    declaration = os.path.join(root, source) if source else ""
    if declaration and os.path.isfile(declaration):
        with open(declaration, "r", encoding="utf-8") as handle:
            body = handle.read()
        existing_declaration = files.get_file_from_path(DECLARATION_DEST)
        if existing_declaration is not None:
            files.remove(existing_declaration)
        files.append(
            File.generated(
                config,
                DECLARATION_DEST,
                content=_render_declaration_page(body, source),
            )
        )

    index_dest = f"{ADR_DEST_PREFIX}/index.md"
    existing_index = files.get_file_from_path(index_dest)
    if existing_index is None:
        files.append(File.generated(config, index_dest, content=render_adr_index(records)))

    return files
