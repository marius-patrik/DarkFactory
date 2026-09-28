---
name: pipeline-operations
description: Steering the DarkFactory pipeline on issues and pull requests with comment commands.
---

# DarkFactory pipeline operations

The DarkFactory pipeline is driven by GitHub comments on the Request issue and the associated pull
request. Comment commands are the only way a human advances or redirects a run.

## Core commands

| Comment | What it does | Where it applies | Who may use it |
|---|---|---|---|
| ``/df approve`` | Approves the gate the run is currently waiting on. | Any open gate | The Request author, or any account whose repository association is `OWNER`, `MEMBER` or `COLLABORATOR`. Bot accounts are never accepted. |
| ``/df reject <feedback>`` | Returns the run to the stage that produced the artifact under review, with the feedback attached. Free text after the verb is the reason. | Any open gate | Same approver set as above. |
| ``/df revise`` | Alias of ``/df reject``. The parser normalises it to *reject* and treats the trailing text the same way. | Same as *reject* | Same as *reject* |
| ``/df resume`` | Unblocks a run that stopped because every configured account was out of quota. Post it after quota is restored. | A run that is *blocked* on quota | Same as *approve* |

The grammar is strict: a command must be the entire comment, with no surrounding prose. Only a
rejection accepts trailing feedback. Bare legacy words (`approve`, `lgtm`, `good`, `merge`) are still
recognised on issues and pull requests, but new comments should use the ``/df`` form.

## The gates

There are three, and a run waits on one at a time. There is no separate interpretation gate: the
verbatim Request goes straight to Planning, and one reviewed Planning artifact carries the semantic
interpretation of that Request through to alignment.

| Gate | Approving it means |
|---|---|
| **Planning** | The single unified Planning artifact — semantic interpretation of the verbatim Request, the evidence-justified approach, dependencies, recovery inputs and verification expectations — is accepted. Planning passes an independent review/fix loop until clean first; approval is the last step, not the first. |
| **Deviation** | Material implementation scope that falls outside approved Planning is accepted. It does not re-open Planning. |
| **Merge** | The implementation is aligned against approved Planning plus approved amendments, and the final merge is authorised. |

Rejecting at the Planning gate routes the run back for another review/fix iteration. Rejecting at
Deviation or Merge returns the run to implementation with your reason attached.

Planning approval goes stale after a material change to the Request, the base, a dependency or the
recovery context, and cannot be silently reused.

## Resuming after a quota stop

When every configured account is out of quota, the run pauses and posts a comment containing the
resume instructions:

```
When quota limits reset or additional quota is provisioned:
1. Verify that quota is available on at least one configured harness.
2. Comment `/df resume` on this issue/PR to resume execution.
3. The agent resumes from the checkpoint on whichever harness is available.
```

To check state before you resume:

```sh
df quota --json            # quota state for every provider, account and model
df ci runs                 # recent workflow runs of the repository
df ci logs <run-id>        # logs of one run
```

## What the pipeline runs

The pipeline is not read-only against df. It configures credentials and executes work through df
itself:

- `df account set` places an API-key slot from a repository secret.
- `df account load` installs a previously exported account record from an environment variable.
- `df run` executes planning, implementation and review stages.

Availability always comes from the quota engine, so a run that cannot route reports unavailable
providers rather than failing on a hand-run provider probe.

## Quick cheat-sheet

* Approve the open gate: ` /df approve `
* Reject with feedback: ` /df reject <your notes> `
* Revise (same as reject): ` /df revise <notes> `
* Resume after quota: ` /df resume `

These are **GitHub comment commands**, not shell commands. The three read-only `df` checks above are
the only commands you need to type yourself.
