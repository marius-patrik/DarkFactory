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
    """Rule 7 keeps `main` protected and all work on branches behind pull requests."""
    content = _read("AGENTS.md").lower()
    for token in ("pull request", "branch", "ci", "protect", "main", "draft"):
        assert token in content, f"AGENTS.md must mention {token!r}"


def test_agents_mandates_issue_binding_and_board_taxonomy():
    """Rule 9 binds every PR to an issue and names the full status taxonomy."""
    content = _read("AGENTS.md").lower()
    assert "closes" in content
    assert "project board" in content
    for status in ("backlog", "todo", "in progress", "blocked", "done", "superseded", "dropped"):
        assert status in content, f"AGENTS.md must define the {status!r} status"


def test_agents_mandates_plan_gate_and_verbatim_requests():
    """Rules 10 and 12 keep both human approval gates in the process."""
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


def test_architecture_is_declared_normative_and_vision_is_not():
    """The precedence between the two documents is stated in both of them."""
    architecture = _read("ARCHITECTURE.md")
    vision = _read("VISION.md")
    assert "Status: NORMATIVE" in architecture
    assert "NON-NORMATIVE" in vision
    assert "ARCHITECTURE.md" in vision, "VISION.md must point at the normative document"


def test_architecture_lists_open_decisions_with_identifiers():
    """Every open decision is addressable, so an issue and an ADR can reference it."""
    architecture = _read("ARCHITECTURE.md")
    identifiers = set(re.findall(r"\bD([1-9]\d*)\b", architecture))
    assert {"1", "2", "3", "4", "5", "6", "7", "8"} <= identifiers


def test_roadmap_epics_are_addressable():
    """Every epic has an `E<n>` identifier that issues and gates can cite."""
    roadmap = _read("ROADMAP.md")
    epics = set(re.findall(r"\bE(\d+)\b", roadmap))
    assert len(epics) >= 8, f"expected at least 8 epics, found {sorted(epics)}"


def test_vision_declares_its_provenance():
    """A transcript-derived document must say where it came from and how complete it is."""
    vision = _read("VISION.md")
    assert "gemini.google.com" in vision, "VISION.md must cite its source conversation"
    assert "notes/vision_capture.md" in vision, "VISION.md must link the provenance note"


def test_vision_gap_markers_agree_with_the_capture_note():
    """Completeness is claimed in one place; the two documents must not contradict each other."""
    vision = _read("VISION.md")
    capture = _read("notes", "vision_capture.md")
    claims_complete = "Status: complete" in capture

    if claims_complete:
        assert "[GAP]" not in vision, (
            "notes/vision_capture.md claims the capture is complete, "
            "but VISION.md still carries [GAP] markers"
        )
    else:
        assert "[GAP]" in vision, (
            "notes/vision_capture.md does not claim completeness, "
            "so VISION.md must mark where it is partial"
        )


def test_vision_carries_review_notes():
    """Recording a source faithfully is not the same as endorsing it."""
    vision = _read("VISION.md")
    assert "Review notes" in vision or "[REVIEW]" in vision
    assert "ARCHITECTURE.md" in vision, "VISION.md must defer to the normative document"


@pytest.mark.parametrize(
    "document",
    ["README.md", "AGENTS.md", "ARCHITECTURE.md", "ROADMAP.md", "VISION.md"],
)
def test_core_documents_are_present_and_substantial(document: str):
    """Placeholder documents are worse than missing ones; require real content.

    Args:
        document: Repository-root document name.
    """
    content = _read(document)
    assert len(content) > 500, f"{document} looks like a placeholder"
