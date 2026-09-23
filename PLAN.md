# DarkFactory — Final Integration Plan

## Authority

There is one implementation plan:

- architecture: `PRD.md`
- executable checklist and merge contract: #68
- branch: `finish/darkfactory`
- PR: #1009
- target: `darkfactory`

This file records only the high-level execution order. **#68 contains the concrete file moves, deletions, implementation tasks and verification gates.**

The old required child Requests are closed historical records. Do not use them as implementation plans.


## Execution order

### Step 0 — Stabilize the consolidated branch

Fix consolidation regressions first and establish a known-good #1009 baseline containing the preserved #894/#899/#963 work.

### Step 1 — Finish runtime, mutation truth and shared git

Finalize one production graph/run/effect path, move conflict repair into final ownership, complete the common deterministic git substrate, and prove effect idempotency plus real graph re-entry.

### Step 2 — Relocate useful harness TypeScript and delete harness

Move working implementation by subsystem into its final package/capability owner, move tests with it, remove final-owner imports back into harness, remove harness from the workspace, then delete `harness/`.

Do not rewrite working TypeScript merely to change ownership.

### Step 3 — Replace the Python outer engine with df and delete Python

Make df the direct production entrypoint, move each still-required Python responsibility to its final TypeScript owner, convert workflows, remove the Python runner/scripts/tests/runtime, and retain only generic support for Python consumer repositories.

### Step 4 — Finish operator and policy surfaces

In parallel on stable final owners:

- hooks/rules;
- OAuth and multi-account login;
- CLI/operator commands;
- TUI.

### Step 5 — Finish governance, stacks and recovery

On the single graph/git/GitHub substrate:

- Epic/Request relationships;
- stacked PR orchestration;
- local/recovered work intake through the ordinary governed lifecycle.

### Step 6 — Finish Web and current-only docs

Settle the browser-safe auth/GitHub transport, finish the one reusable prebuilt web app and quota/operator surfaces, then perform the final current-truth documentation pass and docs-drift enforcement.

### Step 7 — Build the final release candidate

Freeze versioning only after implementation is complete. Build source-free npm/native/web/runtime artifacts from the exact #1009 head and run clean-install/platform smoke tests.

### Step 8 — Fleet proof and final cleanup

Run exact-head DarkFactory E2E proof, install the exact release candidate across all six consumers, fix every discovered defect on the same branch, generate `audit.df`, clean recovery/topic/worktree/stash state, and leave #1009 ready for coordinator merge.

## Rules

- one issue, one implementation branch, one PR, one final merge;
- no compatibility/parity/shadow/canary migration phase;
- move useful harness TypeScript rather than blindly rewriting it;
- delete DarkFactory Python rather than mechanically porting it;
- no known defect is deferred past merge;
- CI green alone is not completion;
- the exact Step 0–8 checkboxes in #68 are the merge gate;
- implementation workers do not merge #1009.
