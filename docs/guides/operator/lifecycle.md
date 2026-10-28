# Operating a governed Request

**Source of authority:** [README product lifecycle](../../../README.md), [finish plan #2070](https://github.com/marius-patrik/DarkFactory/issues/2070) and current linked Request/Planning.

## Intake and planning

Record original user intent and dependency links. Planning should isolate independently verifiable chunks, identify ownership and verification, and receive independent review before the sole explicit Planning Approval. Do not start implementation on a pending/stale approval.

## Agent execution and PR stacks

Execution belongs to the persisted workflow graph. Isolated worktrees and dependency-ordered integration are required for parallel chunks. GitHub mutations must be made by deterministic owners; model summaries do not establish success. For stacked PRs, verify target branches and each dependency before requesting approvals.

## Checks and review

Execute the capability-resolved quality actions and observe external CI check references; unknown, skipped, missing or stale required checks are failures. Fix/review cycles must preserve the approved scope or request an explicit scope amendment.

## Merge authorization

An authenticated human must review exact head, approvals, branch protection and verified effects; never self-approve or bypass protected lanes. Record expected old remote SHA and verify readback after a lease-safe push/merge.

## Release operations

Follow [candidate and promotion rules](../release/publishing.md). No incomplete candidate belongs on live Pages.
