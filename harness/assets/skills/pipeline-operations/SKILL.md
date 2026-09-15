---
name: pipeline-operations
description: Steering the DarkFactory pipeline on issues and pull requests with comment commands.
---

# DarkFactory pipeline operations

The DarkFactory pipeline is driven **entirely by GitHub comments** on the Request/Plan issues and the associated pull request.  The agents watch for a strict command grammar defined in `.github/scripts/commands.py`.

## Core commands

| Comment | What it does | Where it applies | Who may use it |
|---|---|---|---|
| ``/df approve`` | Advances the current gate (interpretation → plan → implementation) | The interpretation and plan gates on the Request issue | The request author, or anyone with the GitHub association `OWNER`, `MEMBER` or `COLLABORATOR` (see `is_allowed_approver` in `agent_runner.py`). |
| ``/df reject <feedback>`` | Sends the pipeline back to the previous stage with the supplied feedback attached to the comment.  The free‑text after the command is extracted by `command_feedback` and stored on the issue. | Any *issue* gate (Interpretation, Plan) | Same approver set as above. |
| ``/df revise`` | Alias of ``/df reject`` – the parser normalises it to *reject* and treats the trailing text exactly the same way. | Same as *reject* | Same as *reject* |
| ``/df resume`` | Unblocks a pipeline that stopped because of a quota exhaustion.  The comment must be posted after the quota is restored. | Any gate that is currently *blocked* (usually after `quota_resume.py` triggers) | Same as *approve* – the approver role is checked again. |

The strict grammar is captured by the regular expression `STRICT_COMMAND` in `commands.py` and **must be the entire comment** (no surrounding prose).  A rejection command is the only one that allows trailing feedback, matched by `STRICT_REJECT_WITH_FEEDBACK`.

## Legacy spellings

Older versions of DarkFactory accepted bare words without the ``/df`` prefix.  Those legacy maps are still exported for compatibility:

```python
LEGACY_ISSUE_COMMANDS = {
    "approve": "approve",
    "/approve": "approve",
    "lgtm": "approve",
    "good": "approve",
    "resume": "resume",
    "/resume": "resume",
}

LEGACY_PR_COMMANDS = {
    "approve": "approve",
    "/approve": "approve",
    "merge": "approve",
    "/merge": "approve",
    "lgtm": "approve",
}
```

New comments should always use the ``/df`` form to avoid ambiguity.

## Resuming after a quota stop

When every configured account is out of quota, the pipeline pauses and posts a comment that contains the **resume instructions** (the constant `RESUME_INSTRUCTIONS` in `commands.py`).  It looks like this:

```
When quota limits reset or additional quota is provisioned:
1. Verify that quota is available on at least one configured harness.
2. Comment `/df resume` on this issue/PR to resume execution.
3. The agent resumes from the checkpoint on whichever harness is available.
```

After the quota is restored you can run a few df CLI commands to see the current state:

```sh
df quota --json            # quota state for every provider, account and model
df ci runs                 # recent workflow runs of the repository
df ci logs <run-id>        # logs of one run
```

These are the **only** df CLI commands referenced in this skill – they are read‑only checks; the pipeline itself never invokes the CLI.

## Where these commands live

* The comment parsing lives in **`.github/scripts/commands.py`** (docstring and the constants shown above).
* Permission checking is done by **`.github/scripts/agent_runner.py`** via `is_allowed_approver`.
* The resume footer text is the constant `RESUME_INSTRUCTIONS` in `commands.py`.

## Quick cheat‑sheet

* Approve: ` /df approve `
* Reject with feedback: ` /df reject <your notes> `
* Revise (same as reject): ` /df revise <notes> `
* Resume after quota: ` /df resume `

Remember: these are **GitHub comment commands**, not shell commands.  The only df CLI commands you need to type are the three read‑only checks listed above.
