# ADR-0013 — df runs the workflow graph

**Status**: Accepted · 2026-09-15

## Context

The delivery workflow (#68) is a graph of stages, gates and loops. Several decisions shaped how it runs.

On self-review, the owner answered on 2026-09-13 that there is one `df run` per self-review iteration, with context
carried as a summary on the branch. Out-of-scope findings (plan deviation, scope amendment) need a second, lighter
approval gate. When self-review was then implemented as a loop inside one job (#285), the owner rejected it
(2026-09-14):

> "self review is supposed to run post all findings then fix gets dispatched then it repeats until no findings not a single review runnning forever"

On checks, the owner answered on 2026-09-14 that checks stay outside the runtime graph. A separate CI-management
engine lets users manage CI from the TUI and CLI, and df pre-installs workflows onto repositories.

On orchestration, the owner decided that the lane orchestration then done by scripts and by hand should move into df
(2026-09-15):

> "orchestration and chunking and scope allignment should be handled by df as well"

> "orchestration via graph"

## Decision

- The workflow is a declared graph that df executes, with stage, gate, loop and foreach nodes.
- Each self-review iteration is its own run. A review run posts all findings as one comment and dispatches a fix run.
  The fix run applies the findings, pushes, and dispatches the next review. This repeats until a review has no
  findings.
- Out-of-scope self-review findings pass a second, lighter approval gate before they are applied.
- Orchestration is part of the same graph: picking the next Request, splitting it into single-purpose chunks,
  implementing and verifying each chunk, scope and plan-alignment review with a loop back on findings, commit, pull
  request and the merge gate.
- Checks run outside the runtime graph. CI is managed by its own engine.

## Alternatives rejected

- **One self-review loop inside a single long-running job (#285).** Rejected by the owner: a review must end, post
  everything it found, and hand over to a fix run.
- **Orchestration in lane scripts with hand-written chunk prompts.** The logic would live outside df, where df users
  cannot use it, and every Request would still need a human orchestrator.
- **Checks as graph nodes.** Rejected in favor of CI, where branch protection already requires the checks.

## Consequences

- A run can stop at any node (quota, gate, failure) and a later run resumes from what the branch and the pull request
  carry, not from process memory.
- The graph definition is the one description of the workflow. Lane scripts that duplicate it are retired as the
  executor takes over their stages.
- CI configuration is managed through df's CI engine rather than edited as part of a run.
