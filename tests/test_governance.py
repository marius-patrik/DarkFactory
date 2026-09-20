"""Tests that the governance documents actually state the rules the automation relies on.

These are contract tests between prose and code. If someone softens a rule in `AGENTS.md`, the
automation that enforces it becomes a lie; these tests fail first.
"""

import os
import re

import pytest

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _read(*parts: str) -> str:
    """Reads a repository file as text.

    Args:
        *parts: Path components relative to the repository root.

    Returns:
        File contents.
    """
    with open(os.path.join(REPO_ROOT, *parts), encoding="utf-8") as handle:
        return handle.read()


def test_agents_file_exists_and_is_the_canonical_source():
    """`AGENTS.md` is real; `CLAUDE.md` imports it and `CONTRIBUTING.md` links to it."""
    content = _read("AGENTS.md")
    assert len(content) > 1000
    assert os.path.isfile(os.path.join(REPO_ROOT, "CLAUDE.md"))
    assert _read("CLAUDE.md").strip() == "@AGENTS.md"
    path = os.path.join(REPO_ROOT, "CONTRIBUTING.md")
    assert os.path.exists(path), "CONTRIBUTING.md must exist"
    # On platforms without symlink support git materializes the link as a text file whose
    # content is the target path; accept either form.
    target = os.path.realpath(path)
    if os.path.basename(target) != "AGENTS.md":
        assert (
            _read("CONTRIBUTING.md").strip() == "AGENTS.md"
        ), "CONTRIBUTING.md must resolve to AGENTS.md"


def test_agents_mandates_branches_prs_ci_and_protection():
    """DF-RULE-007 keeps normal work on dedicated PR branches behind current-base checks."""
    content = _read("AGENTS.md").lower()
    for token in ("pull request", "branch", "draft", "required checks", "branch protection"):
        assert token in content, f"AGENTS.md must mention {token!r}"
    assert "canonical/default branch" in content or "canonical branch" in content
    assert "`main` is never assumed" in content


def test_agents_mandates_issue_binding_and_board_taxonomy():
    """DF-RULE-009 binds every delivery PR to Requests and defines the seven project states."""
    content = _read("AGENTS.md").lower()
    assert "explicitly bind every request" in content
    assert "status uses one canonical reconciliation model" in content
    for status in ("backlog", "todo", "in progress", "blocked", "done", "superseded", "dropped"):
        assert status in content, f"AGENTS.md must define the {status!r} status"


def test_agents_mandates_plan_gate_and_verbatim_requests():
    """DF-RULE-010/012 encode the current unified Planning gate and verbatim Request capture."""
    content = _read("AGENTS.md")
    assert "one current unified Planning artifact" in content
    assert "independent review/fix loop until clean" in content
    assert "one explicit owner Planning Approval" in content
    assert "verbatim" in content.lower()
    assert "no separate interpretation approval gate" in content.lower()


def test_agents_points_repository_taxonomy_to_repo_df():
    """DF-RULE-015 keeps repository area taxonomy in repo.df instead of duplicating it in prose."""
    content = _read("AGENTS.md")
    assert "Repository area labels/scopes are declared by `repo.df`" in content
    assert (
        "Request classification, commit-scope validation and repository labels consume the same declared taxonomy"
        in content
    )


def test_prd_is_the_normative_product_document_with_explicit_authority_hierarchy():
    """PRD.md is normative while Requests, ADRs, declarations and rules keep scoped authority."""
    prd = _read("PRD.md")
    assert "Status: NORMATIVE" in prd
    for authority in (
        "`PRD.md` defines product requirements and architecture",
        "Current Request bodies define approved feature-specific behavior",
        "Accepted ADRs",
        "`repo.df`, `config.df`, `docs.df`",
        "`.agents/rules/*.md`",
    ):
        assert authority in prd
    assert not os.path.exists(
        os.path.join(REPO_ROOT, "ARCHITECTURE.md")
    ), "ARCHITECTURE.md must be retired; PRD.md carries its durable content"
    assert not os.path.exists(os.path.join(REPO_ROOT, "VISION.md")), "VISION.md must be retired"


def test_legacy_knowledge_files_are_absent():
    """No legacy knowledge ledger may remain tracked.

    Work sequencing lives in issues/project fields; a deleted roadmap must not be replaced by
    another hand-maintained epic table.
    """
    for legacy in ("VISION.md", "ROADMAP.md"):
        assert not os.path.exists(os.path.join(REPO_ROOT, legacy)), f"{legacy} must be retired"
    roadmap_names = {path for path in os.listdir(REPO_ROOT) if path.lower().startswith("roadmap")}
    assert not roadmap_names, f"unexpected roadmap files: {sorted(roadmap_names)}"
    assert not os.path.exists(
        os.path.join(REPO_ROOT, ".agents", "notes", "architecture_decisions.md")
    ), "the deprecated ADR ledger must be retired; one file per decision lives under .agents/notes/adr/"


def test_every_adr_is_a_discrete_record_with_status_and_date():
    """Each ADR is one discrete record and every ADR in the repository is current and Accepted."""
    adr_dir = os.path.join(REPO_ROOT, ".agents", "notes", "adr")
    names = sorted(name for name in os.listdir(adr_dir) if name.endswith(".md"))

    records = [name for name in names if name not in ("README.md", "index.md")]
    assert records, "no discrete ADR records found"

    readme_content = _read(os.path.relpath(adr_dir, REPO_ROOT), "README.md")

    numbers: list[str] = []
    for name in records:
        content = _read(os.path.relpath(adr_dir, REPO_ROOT), name)
        heading = re.search(r"^#\s+ADR-(\d{4})\s+—\s+(.+?)\s*$", content, re.M)
        assert heading, f"{name} must open with a '# ADR-NNNN — Title' heading"
        number = heading.group(1)
        numbers.append(number)
        status_match = re.search(r"\*\*Status\*\*:\s*([^\n]+)", content)
        assert status_match, f"{name} must carry a Status field"
        assert (
            status_match.group(1).strip() == "Accepted"
        ), f"{name} must be Accepted; non-current ADRs are forbidden"
        assert f"ADR-{number}" in readme_content, f"ADR-{number} must be indexed in README.md"

    assert len(numbers) == len(set(numbers)), "ADR numbers must be unique"
    assert numbers == sorted(numbers), "ADR records must remain monotonically numbered"
    for name, number in zip(records, numbers):
        assert name.startswith(f"{number}-"), f"{name} must match its ADR heading number"


def test_prd_names_current_modular_architecture_and_capability_boundary():
    """The PRD keeps the accepted package/capability architecture rather than retired D1-D8 shorthand."""
    prd = _read("PRD.md")
    for package in (
        "@darkfactory/protocol",
        "@darkfactory/core",
        "@darkfactory/capability",
        "@darkfactory/github",
        "@darkfactory/keychain",
        "@darkfactory/auth",
        "@darkfactory/docs",
        "@darkfactory/cli",
        "@darkfactory/web",
    ):
        assert package in prd
    assert "Core owns mechanisms" in prd
    assert "Agentic/product behavior belongs in versioned capabilities" in prd


def test_dockerfile_enforces_non_root_user():
    """Agent processes execute with non-root privileges in the production image.

    The Dockerfile must contain a ``USER agent`` directive so the invariant is
    enforced by the container runtime rather than depending on product prose.
    """
    dockerfile = _read("docker", "Dockerfile.agent")
    # Match a standalone USER directive (ignoring inline comments).  The regex
    # anchors to a line start so it cannot match a comment or a RUN echo.
    assert re.search(r"(?m)^USER\s+agent\b", dockerfile), (
        "docker/Dockerfile.agent must contain a 'USER agent' directive "
        "to enforce non-root agent execution"
    )


def test_the_user_directive_is_effective_where_it_sits():
    """A `USER` directive at the top would pass a substring check and break the build.

    Its position is what makes it work: after the last `RUN`, so package installation still has the
    root it needs, and before `ENTRYPOINT`, so every agent process inherits the unprivileged user.
    The plan for this change called for the assertion and it was not written, so it is added here.
    """
    dockerfile = _read("docker", "Dockerfile.agent")
    lines = dockerfile.split("\n")
    user_at = next(i for i, line in enumerate(lines) if re.match(r"^USER\s+agent\b", line))
    last_run = max(i for i, line in enumerate(lines) if line.startswith("RUN "))
    entrypoint_at = next(i for i, line in enumerate(lines) if line.startswith("ENTRYPOINT"))
    assert (
        last_run < user_at < entrypoint_at
    ), "USER agent must follow the last RUN layer and precede ENTRYPOINT"


def test_dockerfile_agent_uid_matches_runner():
    """The agent uid is 1001, matching the GitHub runner's own user.

    This keeps the bind-mounted workspace writable without loosening its
    permissions; changes must remain coordinated with runner configuration.
    """
    dockerfile = _read("docker", "Dockerfile.agent")
    assert re.search(r"(?m)^ARG\s+AGENT_UID\s*=\s*1001\b", dockerfile), (
        "docker/Dockerfile.agent must define AGENT_UID=1001 "
        "(matching the GitHub runner uid for workspace bind-mount compatibility)"
    )


@pytest.mark.parametrize(
    "document",
    ["README.md", "AGENTS.md", "PRD.md"],
)
def test_core_documents_are_present_and_substantial(document: str):
    """Placeholder documents are worse than missing ones; require real content.

    Args:
        document: Repository-root document name.
    """
    content = _read(document)
    assert len(content) > 500, f"{document} looks like a placeholder"


def test_prd_does_not_duplicate_manifest_taxonomy_or_graph() -> None:
    """Executable declarations live in the manifest, not in the product document.

    The PRD must not re-state the area taxonomy or a hardcoded stage graph, because those have one
    executable home (`.darkfactory/repo.df` and the workflow graph) and any copy drifts.
    """
    prd = _read("PRD.md")
    assert "AREA_LABELS" not in prd
    assert "Quota-Gated Project Automation & Rate-Limit Backoff" not in prd
    assert "GRAPHQL_REMAINING" not in prd
    assert "MUTATION_BUDGET" not in prd
    assert "agent_runner.py" not in prd


RULES_DIR = os.path.join(".agents", "rules")


def _rule_files() -> list:
    """Returns the sorted basenames of the canonical rule files."""
    return sorted(
        name for name in os.listdir(os.path.join(REPO_ROOT, RULES_DIR)) if name.endswith(".md")
    )


def _front_matter(path: str) -> dict:
    """Parses a rule file's YAML front matter into a dict."""
    text = _read(path)
    if not text.startswith("---\n"):
        return {}
    _, body = text.split("---\n", 1)
    front, _rest = body.split("\n---\n", 1)
    fields = {}
    for line in front.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            fields[key.strip()] = value.strip().strip('"')
    return fields


def test_every_rule_has_unique_stable_id_and_required_sections():
    """Each rule file is one canonical, complete, size-bounded document."""
    files = _rule_files()
    assert len(files) == 16, f"expected exactly sixteen rules, found {files}"
    seen = set()
    for name in files:
        path = os.path.join(RULES_DIR, name)
        number, _, slug = name.partition("-")
        assert slug.endswith(".md"), f"{name} must be NNN-slug.md"
        meta = _front_matter(path)
        assert meta.get("status") == "normative", f"{name} must be status: normative"
        stable_id = f"DF-RULE-{number}"
        assert meta.get("id") == stable_id, f"{name} front matter id must be {stable_id}"
        assert stable_id not in seen, f"duplicate id {stable_id}"
        seen.add(stable_id)
        for field in ("title", "applies_to", "activation", "owners"):
            assert meta.get(field), f"{name} front matter must declare {field}"
        body = _read(path)
        for section in (
            "## Requirement",
            "## Rationale",
            "## Enforcement",
            "## Exceptions",
            "## Change control",
        ):
            assert section in body, f"{name} must carry a {section!r} section"
        assert len(body) < 12000, f"{name} exceeds Antigravity's 12,000-character file limit"


def _index_rows(agents: str) -> dict:
    """Parses the AGENTS.md index into {stable_id: canonical file}."""
    rows = {}
    pattern = re.compile(
        r"^\| `(DF-RULE-\d{3})` \| .+? \| `(\.agents/rules/\d{3}-[a-z0-9-]+\.md)` \|$"
    )
    for line in agents.splitlines():
        match = pattern.match(line)
        if match:
            rows[match.group(1)] = match.group(2)
    return rows


def test_agents_projection_matches_rule_sources():
    """The AGENTS.md projection carries every canonical rule, exactly once."""
    agents = _read("AGENTS.md")
    assert len(agents) < 32 * 1024, "Codex enforces a cumulative 32 KiB AGENTS.md limit"
    index = _index_rows(agents)
    assert len(index) == 16, "the projection index must list all sixteen rules"
    for name in _rule_files():
        number = name.split("-", 1)[0]
        stable_id = f"DF-RULE-{number}"
        assert (
            index.get(stable_id) == f".agents/rules/{name}"
        ), f"{stable_id} index row must resolve to {name}"
        # The mandatory behavior text is embedded, not linked away.
        path = os.path.join(RULES_DIR, name)
        requirement = _read(path).split("## Requirement\n", 1)[1].split("\n## Rationale\n", 1)[0]
        assert _normalize(requirement) in _normalize(
            agents
        ), f"{name} requirement must be projected"
    assert agents.count("### Rule ") == 16, "every canonical rule must have a projected heading"


def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def test_rule_enforcement_pointers_resolve_or_say_unenforced():
    """Every enforcement pointer is real, or the rule says it is unenforced."""
    bases = (
        REPO_ROOT,
        os.path.join(REPO_ROOT, ".github"),
        os.path.join(REPO_ROOT, ".github", "scripts"),
        os.path.join(REPO_ROOT, ".github", "workflows"),
    )
    for name in _rule_files():
        body = _read(os.path.join(RULES_DIR, name))
        enforcement = body.split("## Enforcement\n", 1)[1].split("\n## Exceptions\n", 1)[0]
        if "unenforced" in enforcement.lower():
            continue
        for token in re.findall(r"`([^`]+)`", enforcement):
            pointer = re.sub(r"^\./", "", token.split("::", 1)[0].strip())
            if not pointer or "." not in pointer or pointer.startswith("Area"):
                continue
            assert any(
                os.path.exists(os.path.join(base, pointer)) for base in bases
            ), f"{name} enforcement pointer {pointer!r} does not resolve"


def test_runtime_references_use_canonical_agent_paths():
    """Automation never traverses the root `_notes` / `_rules` aliases."""
    scripts_dir = os.path.join(REPO_ROOT, ".github", "scripts")
    for name in sorted(os.listdir(scripts_dir)):
        if not name.endswith(".py"):
            continue
        source = _read(os.path.relpath(scripts_dir, REPO_ROOT), name)
        for alias in ("_notes", "_rules"):
            assert (
                re.search(rf'os\.path\.join\(\s*"{alias}"', source) is None
            ), f"{name} must use the canonical .agents path, not the root {alias} alias"
    assert 'ADR_SOURCE_DIR = os.path.join(".agents", "notes", "adr")' in _read(
        ".github", "scripts", "docs_hooks.py"
    ), "docs_hooks must discover ADRs under the canonical directory"
