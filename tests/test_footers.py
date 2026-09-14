"""Tests asserting each command footer and instruction names the strict commands."""

from commands import INTERPRETATION_FOOTER, PLAN_FOOTER, RESUME_INSTRUCTIONS


def test_interpretation_footer_names_strict_commands():
    """Interpretation footer must instruct users with strict /df approval and rejection commands."""
    assert "/df approve" in INTERPRETATION_FOOTER
    assert "/df reject" in INTERPRETATION_FOOTER


def test_plan_footer_names_strict_commands():
    """Plan footer must instruct users with strict /df approval and rejection commands."""
    assert "/df approve" in PLAN_FOOTER
    assert "/df reject" in PLAN_FOOTER


def test_resume_instructions_names_strict_commands():
    """Resume instructions must instruct users with the strict /df resume command."""
    assert "/df resume" in RESUME_INSTRUCTIONS
