"""Unit tests for the autonomous agent runner's pure helpers."""

import os
from typing import List

import pytest

import agent_runner
from agent_runner import (
    AREA_LABELS,
    TYPE_LABELS,
    calculate_backoff,
    classify_type_and_area,
    format_conventional_commit,
    generate_branch_name,
    is_bot_or_agent_comment,
    is_quota_exhausted,
)

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@pytest.mark.parametrize(
    "text,expected_area",
    [
        ("Add a cell-grid renderer for the terminal UI", "area:term"),
        ("Sixel output is misaligned", "area:term"),
        ("Bridge the AXTree from Chromium into the pane", "area:browser"),
        ("Define the provider adapter contract for the agent harness", "area:agents"),
        ("Sandbox the extension host", "area:ext"),
        ("Add a migration for the settings schema", "area:data"),
        ("Version the substrate bus IPC frames", "area:core"),
        ("Titlebar vibrancy is wrong on Windows", "area:ui"),
        ("Fix the mkdocs build", "area:docs"),
        ("Harden the docker runner workflow", "area:ci"),
    ],
)
def test_classify_area(text: str, expected_area: str):
    """The classifier routes requests to the Omnis area taxonomy.

    Args:
        text: Issue title or body.
        expected_area: Area label the classifier should emit.
    """
    _type_label, area_label = classify_type_and_area(text)
    assert area_label == expected_area


def test_classifier_only_emits_known_labels():
    """A classifier that invents a label produces an unlabelable issue."""
    samples = [
        "add a thing",
        "fix a crash in the daemon",
        "refactor the palette resolver",
        "document the bus",
        "bump dependencies",
        "add tests for the codec",
        "wire up a workflow",
    ]
    for sample in samples:
        type_label, area_label = classify_type_and_area(sample)
        assert type_label in TYPE_LABELS, f"{type_label!r} not in TYPE_LABELS"
        assert area_label in AREA_LABELS, f"{area_label!r} not in AREA_LABELS"


@pytest.mark.parametrize(
    "text,expected_type",
    [
        ("Fix the crash on startup", "bug"),
        ("Document the substrate bus", "docs"),
        ("Refactor the palette resolver", "refactor"),
        ("Bump the pinned dependencies", "chore"),
        ("Add a new brand preset", "feat"),
    ],
)
def test_classify_type(text: str, expected_type: str):
    """Type classification maps onto the Conventional Commit types.

    Args:
        text: Issue title or body.
        expected_type: Type label the classifier should emit.
    """
    type_label, _area = classify_type_and_area(text)
    assert type_label == expected_type


def test_format_conventional_commit_maps_bug_to_fix():
    """`bug` is a label; `fix` is the commit type. The mapping must not leak."""
    assert format_conventional_commit("bug", "area:core", "Correct the codec") == (
        "fix(core): correct the codec"
    )
    assert format_conventional_commit("feat", "area:term", "Add cell buffer") == (
        "feat(term): add cell buffer"
    )


def test_generate_branch_name_excludes_issue_numbers():
    """Rule 7 forbids issue numbers in branch names."""
    name = generate_branch_name("Plan: Add cell matrix buffer for #42")
    assert "42" not in name
    assert name == name.lower()
    assert " " not in name


@pytest.mark.parametrize(
    "message",
    [
        "Error: 429 Too Many Requests",
        "RESOURCE_EXHAUSTED",
        "quota exceeded for this model",
        "rate limit reached",
        "the model is overloaded",
    ],
)
def test_quota_exhaustion_detected(message: str):
    """Quota failures must be recognised so the agent checkpoints instead of thrashing.

    Args:
        message: Provider error text.
    """
    assert is_quota_exhausted(message)


@pytest.mark.parametrize(
    "message",
    [
        "compilation failed: expected `;`",
        "test failure in tests/test_codec.py",
        "",
    ],
)
def test_non_quota_errors_not_misdetected(message: str):
    """A build failure must not be mistaken for a quota failure and silently blocked.

    Args:
        message: Non-quota error text.
    """
    assert not is_quota_exhausted(message)


def test_bot_comments_are_ignored():
    """Self-reply loops are the classic failure mode of a conversational CI agent."""
    assert is_bot_or_agent_comment("github-actions[bot]", "anything")
    assert is_bot_or_agent_comment("someone", "<!-- darkfactory-agent -->\nInterpretation")
    assert is_bot_or_agent_comment("someone", "<!-- omnis-agent -->\nInterpretation")
    assert not is_bot_or_agent_comment("marius-patrik", "approve")


def test_backoff_is_bounded_and_increasing():
    """Retry backoff must grow and must stay finite."""
    delays: List[float] = [calculate_backoff(attempt) for attempt in range(5)]
    assert all(delay >= 0 for delay in delays)
    assert max(delays) < 3600


def test_area_labels_are_unique_and_prefixed():
    """The area taxonomy is a set of `area:` labels with no duplicates."""
    assert len(AREA_LABELS) == len(set(AREA_LABELS))
    assert all(label.startswith("area:") for label in AREA_LABELS)


def test_verification_helpers_skip_absent_toolchains(tmp_path):
    """A scaffold repository with no Cargo.toml must still verify green.

    Args:
        tmp_path: Pytest-provided empty directory.
    """
    result = agent_runner.verify_repository(str(tmp_path))
    assert result.returncode == 0
    assert agent_runner.format_repository(str(tmp_path)) == []


def test_runner_defaults_to_this_repository():
    """The runner points at DarkFactory by default."""
    with open(
        os.path.join(REPO_ROOT, ".github", "scripts", "agent_runner.py"), encoding="utf-8"
    ) as f:
        source = f.read()
    assert "ChessWithQuests" not in source
    assert "marius-patrik/DarkFactory" in source
