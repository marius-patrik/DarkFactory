import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../.github/scripts")))

import json
import pytest
from agent_runner import parse_df_json_output


def _stream(*events):
    return "\n".join(json.dumps(e) for e in events)


def test_thinking_text_is_not_part_of_the_answer_after_failover():
    # events text_delta("thinking…") → failover → text_delta("PLAN") → result
    stdout = _stream(
        {"type": "text_delta", "delta": "thinking..."},
        {
            "type": "failover",
            "from": {"provider": "a"},
            "to": {"provider": "b"},
            "reason": "test",
            "errorMessage": "fail",
        },
        {"type": "text_delta", "delta": "PLAN"},
        {"type": "result", "stopReason": "end_turn"},
    )
    # Current implementation would return "thinking...PLAN" because it doesn't reset on failover.
    # The requirement is that it should return "PLAN" (or rather, everything after the last tool call,
    # and failover should trigger a reset as if it were a new attempt).
    # Wait, the requirement says "the answer must be the text of the final successful attempt after its last tool call only."
    # If there are no tool calls, it should be the full text of the LAST attempt.
    assert parse_df_json_output(stdout) == "PLAN"


def test_thinking_delta_never_part_of_answer():
    stdout = _stream(
        {"type": "thinking_delta", "delta": "some thinking"},
        {"type": "text_delta", "delta": "PLAN"},
    )
    assert parse_df_json_output(stdout) == "PLAN"
