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

## Operator checkpoints and exact acceptance evidence

| Checkpoint | Required inputs | Evidence required | If missing |
| --- | --- | --- | --- |
| Request created | Stable repo identity, requested scope, owner | Issue number and original immutable text | Stop; do not invent a Request from a summary |
| Planning compiled | Current base SHA, dependencies, quality plan | Planning revision and review disposition | Return to Planning |
| Planning approval | Authorized owner and reviewed current revision | Explicit approval event tied to exact revision | Block execution; stale approval is invalid |
| Implementation | Approved plan and isolated write scope | Durable run/node ID, effect journal, branch SHA | Reconcile state before retry |
| Required quality | Capability-resolved actual actions | Check IDs/results bound to head SHA; no skipped required action | Fail the gate and repair |
| PR review | Bot PR, inspectable diff, independent reviewer | Review recorded against current PR head | Request fresh review if SHA changes |
| Merge authorization | Human identity, branch rules, expected-old SHA | Explicit decision and remote readback | Never infer authorization from green CI |
| Reconciliation | Merged/ref state, affected issues and projects | Actual remote commit and close/readback evidence | Record partial effect and recover |

**Permissions:** a read-only operator can inspect and report status, but must not replace an authenticated reviewer or GitHub App installation author. Human merge approval is not interchangeable with model confidence, App installation tokens or a prior Planning approval. GitHub branch protection may impose additional requirements; consult the current remote rules, not an example in these guides.

## Concrete read-only verification

For each candidate PR, open the target repository's **Pull requests** tab, inspect **Files changed**, **Commits**, **Checks** and review history. Compare the displayed latest commit SHA to the SHA on all required check conclusions. Review the GitHub issue backlinks and target branch. If a new push occurs after review, require fresh evidence under the actual protection settings. Check the merged commit and linked issue state after merge; an API response to a write without readback is insufficient.

For source-level graph inspection a developer checkout may run `bun packages/cli/src/cli.ts graph validate`; this confirms schema integrity only. The source-declared `graph plan --event <file> --state <file>` is an offline calculation, not an approved execution. Until #2698/#2699 show durable execution, permissions and fault acceptance, this page must not be presented as a successful live operator walkthrough.
