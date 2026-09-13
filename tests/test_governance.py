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
    """`AGENTS.md` is real and `CLAUDE.md` / `CONTRIBUTING.md` point at it."""
    assert os.path.isfile(os.path.join(REPO_ROOT, "AGENTS.md"))
    for alias in ("CLAUDE.md", "CONTRIBUTING.md"):
        path = os.path.join(REPO_ROOT, alias)
        assert os.path.exists(path), f"{alias} must exist"
        # On platforms without symlink support git materializes the link as a text file whose
        # content is the target path; accept either form.
        target = os.path.realpath(path)
        if os.path.basename(target) != "AGENTS.md":
            with open(path, encoding="utf-8") as handle:
                assert handle.read().strip() == "AGENTS.md", f"{alias} must resolve to AGENTS.md"


def test_agents_mandates_branches_prs_ci_and_protection():
    """DF-RULE-007 (`.agents/rules/007-branches-and-pull-requests.md`) keeps `main` protected and all work on branches behind pull requests."""
    content = _read("AGENTS.md").lower()
    for token in ("pull request", "branch", "ci", "protect", "main", "draft"):
        assert token in content, f"AGENTS.md must mention {token!r}"


def test_agents_mandates_issue_binding_and_board_taxonomy():
    """DF-RULE-009 (`.agents/rules/009-issue-binding-and-board-status.md`) binds every PR to an issue and names the full status taxonomy."""
    content = _read("AGENTS.md").lower()
    assert "closes" in content
    assert "project board" in content
    for status in ("backlog", "todo", "in progress", "blocked", "done", "superseded", "dropped"):
        assert status in content, f"AGENTS.md must define the {status!r} status"


def test_agents_mandates_plan_gate_and_verbatim_requests():
    """DF-RULE-010/DF-RULE-012 keep both human approval gates in the process."""
    content = _read("AGENTS.md")
    assert "Matches Plan: Yes" in content
    assert "Plan Alignment:" in content
    assert "verbatim" in content.lower()
    assert "### Interpretation" in content


def test_agents_defines_every_area_label_used_by_the_agent():
    """The area taxonomy in prose matches the one the classifier can emit."""
    import agent_runner

    content = _read("AGENTS.md")
    for label in agent_runner.AREA_LABELS:
        assert label in content, f"AGENTS.md must document the {label!r} scope"


def test_prd_is_the_only_normative_product_document():
    """`PRD.md` declares itself normative and the legacy documents are gone."""
    prd = _read("PRD.md")
    assert "Status: NORMATIVE" in prd
    assert "PRD.md" in prd and "single normative source" in prd
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


def test_architecture_lists_open_decisions_with_identifiers():
    """Every durable decision is addressable, so an issue and an ADR can reference it."""
    prd = _read("PRD.md")
    identifiers = set(re.findall(r"\bD([1-9]\d*)\b", prd))
    assert {"1", "2", "3", "4", "5", "6", "7", "8"} <= identifiers


def test_dockerfile_enforces_non_root_user():
    """D4 claims agent processes execute with non-root privileges.

    The Dockerfile must contain a ``USER agent`` directive so the claim is
    enforced by the container runtime, not merely asserted in prose.  Without
    this test the directive could be silently removed and D4 would revert to
    being false — the exact failure mode that surfaced when Claude Code refused
    ``--dangerously-skip-permissions`` as root.
    """
    dockerfile = _read("docker", "Dockerfile.agent")
    # Match a standalone USER directive (ignoring inline comments).  The regex
    # anchors to a line start so it cannot match a comment or a RUN echo.
    assert re.search(r"(?m)^USER\s+agent\b", dockerfile), (
        "docker/Dockerfile.agent must contain a 'USER agent' directive "
        "to enforce D4's non-root execution claim"
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


def test_prd_names_the_directive_that_enforces_d4():
    """The document and the image must not be able to drift apart independently."""
    prd = _read("PRD.md")
    d4 = next(line for line in prd.split("\n") if line.startswith("| D4 "))
    assert "USER agent" in d4, "D4 must name what enforces it"
    assert "1001" in d4, "D4 must record the uid and therefore the reason for it"
    assert "env scoping" in d4, "D4's second claim must not be lost while documenting the first"


def test_dockerfile_agent_uid_matches_runner():
    """The agent uid is 1001, matching the GitHub runner's own user.

    This keeps the bind-mounted workspace writable without loosening its
    permissions.  If someone changes the uid they must also update
    ``PRD.md`` D4 and the runner configuration.
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
    executable home (`.github/darkfactory.json` and the workflow graph) and any copy drifts.
    """
    prd = _read("PRD.md")
    assert "AREA_LABELS" not in prd
    assert "Quota-Gated Project Automation & Rate-Limit Backoff" not in prd
    assert "GRAPHQL_REMAINING" not in prd
    assert "MUTATION_BUDGET" not in prd
    assert "agent_runner.py" not in prd
