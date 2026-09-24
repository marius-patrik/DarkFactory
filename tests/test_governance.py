"""Temporary container invariants for the legacy agent image.

Long-term rule/note/projection governance is owned and tested by @darkfactory/docs.
This file disappears with the legacy Python/harness image in the final df cutover.
"""

import os
import re

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _dockerfile() -> str:
    with open(os.path.join(REPO_ROOT, "docker", "Dockerfile.agent"), encoding="utf-8") as handle:
        return handle.read()


def test_agent_image_runs_as_non_root():
    """The current agent image executes the entrypoint as the unprivileged agent user."""
    lines = _dockerfile().splitlines()
    user_at = next(i for i, line in enumerate(lines) if re.match(r"^USER\s+agent\b", line))
    last_run = max(i for i, line in enumerate(lines) if line.startswith("RUN "))
    entrypoint_at = next(i for i, line in enumerate(lines) if line.startswith("ENTRYPOINT"))
    assert last_run < user_at < entrypoint_at


def test_agent_uid_matches_runner_workspace_owner():
    """The current bind-mounted runner workspace remains writable without broad permissions."""
    assert re.search(r"(?m)^ARG\s+AGENT_UID\s*=\s*1001\b", _dockerfile())
