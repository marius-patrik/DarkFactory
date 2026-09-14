import pytest
from unittest.mock import patch, MagicMock
from agent_runner import handle_interpret, handle_plan


@patch("agent_runner.run_gh")
@patch("agent_runner.run_agent_prompt")
@patch("agent_runner.classify_type_and_area")
@patch("agent_runner.default_branch")
def test_handle_interpret_includes_footer(mock_branch, mock_classify, mock_prompt, mock_run_gh):
    mock_classify.return_value = ("feat", "area:agents")
    mock_prompt.return_value = "Mocked Interpretation"
    mock_branch.return_value = "main"

    # Setup mock to return issue data
    mock_run_gh.side_effect = [
        json.dumps({"title": "Test", "body": "Body"}),  # issue view
        "",  # add label
        "",  # comment
    ]

    handle_interpret(1, "repo/name")

    # Verify the posted comment contains the footer
    posted_comment = mock_run_gh.call_args_list[-1].args[0]
    # The comment body is the last argument in the call to 'issue comment'
    body = posted_comment[-1]
    assert "Reply with `/df approve` to continue or `/df reject <feedback>` to revise." in body


@patch("agent_runner.run_gh")
@patch("agent_runner.run_agent_prompt")
def test_handle_plan_includes_footer(mock_prompt, mock_run_gh):
    mock_prompt.return_value = "Mocked Plan"

    # Setup mock to return request data
    mock_run_gh.side_effect = [
        json.dumps({"title": "Test", "body": "Body"}),  # issue view
        "",  # comment
    ]

    handle_plan(1, 2, "repo/name")

    # Verify the posted comment contains the footer
    args, kwargs = mock_run_gh.call_args_list[-1]
    body = args[0][-1]
    assert (
        "Reply with `/df approve` to start implementation or `/df reject <feedback>` to revise the plan."
        in body
    )


import json
