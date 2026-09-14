"""Unit tests for the shared approval command grammar.

One module (``commands``) owns every approval-shaped comment so the issue gates in
:mod:`agent_runner` and the merge gate in :mod:`handle_pr_approval` cannot drift apart.
"""

import pytest

from commands import (
    command_feedback,
    is_allowed_approver,
    is_command_hint,
    parse_issue_command,
    parse_pr_command,
)


@pytest.mark.parametrize(
    "body",
    [
        "/df approve",
        "/DF APPROVE",
        "  /df approve  ",
        "/approve",
        "/APPROVE",
    ],
)
def test_strict_approve_commands(body: str):
    """The decided grammar approves on both surfaces.

    Args:
        body: Comment body.
    """
    assert parse_issue_command(body) == "approve"
    assert parse_pr_command(body) == "approve"


@pytest.mark.parametrize(
    "body",
    [
        "/df reject",
        "/df revise",
        "/reject",
        "/revise",
        "/DF REVISE",
    ],
)
def test_strict_reject_commands_normalise_revise(body: str):
    """``revise`` is an alias; both surfaces report ``reject``.

    Args:
        body: Comment body.
    """
    assert parse_issue_command(body) == "reject"
    assert parse_pr_command(body) == "reject"


@pytest.mark.parametrize(
    "body,expected",
    [
        ("/df reject use bun, not npm", "use bun, not npm"),
        ("/reject please fix the scope", "please fix the scope"),
        ("/df revise: use bun", "use bun"),
        ("/revise the plan to use bun", "the plan to use bun"),
        ("/df reject", ""),
    ],
)
def test_rejection_carries_its_reason_as_feedback(body: str, expected: str):
    """A rejection routes the stage back, so the reason rides along with it.

    Args:
        body: Comment body.
        expected: Feedback text.
    """
    assert parse_issue_command(body) == "reject"
    assert parse_pr_command(body) == "reject"
    assert command_feedback(body) == expected


@pytest.mark.parametrize("body", ["approve when ready", "/approve please", "rejected", "/revision"])
def test_approval_like_prose_is_not_a_command(body: str):
    """Approvals and resumes stand alone; trailing text (or a longer word) voids them.

    Args:
        body: Comment body.
    """
    assert parse_issue_command(body) is None
    assert parse_pr_command(body) is None
    assert command_feedback(body) == ""


@pytest.mark.parametrize("body", ["/df resume", "/resume", "/DF RESUME"])
def test_strict_resume_commands(body: str):
    """The decided resume grammar works on both surfaces.

    Args:
        body: Comment body.
    """
    assert parse_issue_command(body) == "resume"
    assert parse_pr_command(body) == "resume"


@pytest.mark.parametrize(
    "body,expected",
    [
        ("approve", "approve"),
        ("Approve", "approve"),
        ("  approve  ", "approve"),
        ("lgtm", "approve"),
        ("LGTM", "approve"),
        ("good", "approve"),
        ("resume", "resume"),
    ],
)
def test_legacy_issue_words_still_work(body: str, expected: str):
    """Bare words that work today keep working on issues.

    Args:
        body: Comment body.
        expected: Parsed command.
    """
    assert parse_issue_command(body) == expected


@pytest.mark.parametrize(
    "body,expected",
    [
        ("approve", "approve"),
        ("/approve", "approve"),
        ("merge", "approve"),
        ("/merge", "approve"),
        ("lgtm", "approve"),
    ],
)
def test_legacy_pr_words_still_work(body: str, expected: str):
    """Bare words that work today keep working on pull requests.

    Args:
        body: Comment body.
        expected: Parsed command.
    """
    assert parse_pr_command(body) == expected


def test_merge_is_not_an_issue_command():
    """``merge`` only ever meant something on pull requests."""
    assert parse_issue_command("merge") is None
    assert parse_issue_command("/merge") is None


def test_good_is_not_a_pr_command():
    """``good`` only ever meant something on issues."""
    assert parse_pr_command("good") is None


@pytest.mark.parametrize(
    "body",
    [
        "I do not approve yet",
        "looks good to me, approve when ready",
        "three concerns, and approve",
        "Checked it against the tree; the claim holds.\n\nOne correction below.\n\napprove",
        "I would approve this once the test exists",
        "approval pending",
        "this needs work before I approve it",
        "",
        "df approve",
        "/df",
        "/df please approve this",
    ],
)
def test_free_text_is_never_a_command(body: str):
    """A mention of the word is discussion, not a decision, on either surface.

    Args:
        body: Comment body.
    """
    assert parse_issue_command(body) is None
    assert parse_pr_command(body) is None


@pytest.mark.parametrize(
    "body",
    [
        "I do not approve yet",
        "looks good to me, merge when ready",
        "please revise the plan",
        "can we resume this?",
    ],
)
def test_free_text_mentioning_a_command_word_is_a_hint(body: str):
    """Such words trigger at most a one-time hint comment, never a gate transition.

    Args:
        body: Comment body.
    """
    assert is_command_hint(body) is True


@pytest.mark.parametrize(
    "body",
    [
        "approve",
        "/df approve",
        "/df reject",
        "lgtm",
        "merge",
        "fix the typo in the docs",
        "",
    ],
)
def test_real_commands_and_unrelated_text_are_not_hints(body: str):
    """Commands act; unrelated text is plain feedback. Neither needs the hint.

    Args:
        body: Comment body.
    """
    assert is_command_hint(body) is False


@pytest.mark.parametrize("association", ["OWNER", "MEMBER", "COLLABORATOR", "owner"])
def test_privileged_associations_may_approve(association: str):
    """Owner decision 9c: role-based approval.

    Args:
        association: Comment ``author_association``.
    """
    assert (
        is_allowed_approver(
            actor="someone", author_association=association, issue_author="anyone-else"
        )
        is True
    )


def test_the_request_author_may_approve():
    """Owner decision 9c: the author approves their own request."""
    assert (
        is_allowed_approver(
            actor="marius-patrik", author_association="CONTRIBUTOR", issue_author="Marius-Patrik"
        )
        is True
    )


@pytest.mark.parametrize("association", ["CONTRIBUTOR", "FIRST_TIMER", "NONE", ""])
def test_strangers_may_not_approve(association: str):
    """Anyone else's ``approve`` is feedback, never a gate transition.

    Args:
        association: Comment ``author_association``.
    """
    assert (
        is_allowed_approver(
            actor="stranger", author_association=association, issue_author="marius-patrik"
        )
        is False
    )


def test_bots_may_never_approve():
    """Even a privileged association does not let a bot through."""
    assert (
        is_allowed_approver(
            actor="github-actions[bot]", author_association="OWNER", issue_author="x"
        )
        is False
    )
    assert (
        is_allowed_approver(actor="someone", author_association="OWNER", user_type="Bot") is False
    )
    assert is_allowed_approver(actor="", author_association="OWNER") is False
