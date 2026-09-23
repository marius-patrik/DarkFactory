# DarkFactory — Final Integration Plan

## Authority

- Architecture: `PRD.md`
- Executable implementation/checklist contract: #68
- Integration branch: `finish/darkfactory`
- Integration PR: #1009
- Target: `darkfactory`

The closed historical Requests are evidence only. #68 is the implementation plan.

## Integration discipline

- #68 is the single executable checklist/validation ledger for this integration. PLAN.md must not grow a second detailed checklist.
- The side-session dispatch that explicitly says to execute #68 is the owner Planning Approval for the narrow bootstrap/completion exception while df's own governed lifecycle is under repair.
- Before changing implementation, the implementation orchestrator independently reviews #68 against the live tree, PRD and accepted ADRs and records the result on #68. A material plan/architecture mismatch is amended in #68 before coding.
- One remote integration branch and one PR remain authoritative. Parallel workers may use temporary local worktrees/branches, but they do not open GitHub issues/PRs or create competing remote delivery branches.
- The orchestrator owns shared integration files such as root manifests/lockfiles, package export maps, workflows, PRD/PLAN/rules/docs and final branch integration unless it explicitly delegates a non-overlapping edit.
- Keep coherent Conventional Commit boundaries per step/lane. Integrate worker commits after targeted verification; do not squash unrelated work into one opaque commit merely because delivery uses one PR.
- Run targeted tests during implementation and the full applicable gate at each numbered step. After a gate passes, update #68 checkboxes and attach concrete evidence (head SHA, commands/runs, relevant audit/provenance) before advancing.
- PR-scoped pipeline failures stay attached to #1009/#68 as evidence. The final failure-reporting implementation must not create a new implementation Request for a failure already bound to existing work.

## Critical spine

```text
Step 0  Green consolidated baseline
  ↓
Step 1  Executable capability architecture + missing official capability owners
  ↓
Step 2  One graph runtime + one git/GitHub substrate + mutation truth
  ↓
Step 3  Relocate remaining useful harness TypeScript into final owners
  ↓
Step 4  Cut production entrypoints to df, then delete harness + DarkFactory Python
  ↓
Step 5  Complete product lanes on final owners
  ↓
Step 6  Current-truth docs + exact-head source-free release candidate
  ↓
Step 7  DarkFactory/fleet proof + final cleanup
```

After Step 2, independent Step 5 lanes may run in parallel when they do not overlap files or consume unsettled interfaces.

## Step summaries

### Step 0 — Green baseline

Fix the current consolidated web/type/docs errors and verify #1009 metadata/check binding. Do not start the large ownership migration from a broken consolidation baseline.

### Step 1 — Capability execution architecture

Extend the capability ABI so official capabilities can execute graph behavior through typed shared contracts while core remains the generic graph/run/effect mechanism.

Create the missing required official capability packages:

- docs
- git
- github
- planning
- review
- ci
- recovery
- epics
- stacks

Extract product-specific Planning/review/GitHub/CI behavior out of generic core ownership.

### Step 2 — Runtime/git/GitHub foundation

Finish one persisted production graph path, one durable effect model, one deterministic git substrate, real branch repair/re-entry, lease-safe pushes, and evidence-backed mutation truth.

### Step 3 — Harness relocation

Move working TypeScript by subsystem into protocol/core/github/keychain/cli and official capabilities. Move tests with implementation. Final packages stop importing harness.

Do **not** delete harness yet; keep only frozen deletion-bound entrypoint material until Step 4 rewires Docker/workflows.

### Step 4 — Direct df cutover and legacy deletion

Switch Docker and workflows directly to final df/capability entrypoints. Replace each still-required Python responsibility in its final TypeScript owner.

Then, in the same phase, delete:

- `harness/`
- obsolete `.github/scripts/*.py`
- obsolete Python tests
- DarkFactory `pyproject.toml` / `requirements-dev.txt`
- DarkFactory-specific Python runtime/setup

Python consumer-project support remains in capability-driven CI.

### Step 5 — Functional completion lanes

Run on stable final owners:

- hooks/rules;
- provider login/accounts + CLI/TUI;
- Epics/stacks/recovery;
- Web/browser transport/operator surfaces;
- fine-grained safe parallel chunks in isolated engine worktrees through the same graph/git substrate.

Concrete TUI recovery is reused only if actual recoverable bytes exist; absence of an unproven historical recovery ref is not a blocker.

### Step 6 — Truth + release candidate

Perform the current-only docs/ADR/README/API pass after behavior freezes.

Build an **unpublished source-free release candidate** from the exact #1009 head and prove package/native/runtime/TUI/web assets in clean environments. Final publication is not required from a non-canonical PR branch.

### Step 7 — Exact-head and fleet proof

Prove the final candidate on DarkFactory and all six consumers, generate `audit.df`, clean branches/worktrees/stashes/recovery refs, and verify the PR base has not changed since proof.

Any defect is fixed on `finish/darkfactory` and affected evidence is rerun.

## Rules

- one issue, one branch, one PR, one final merge;
- no compatibility/parity/shadow/canary migration architecture;
- preserve/move working TypeScript instead of gratuitous rewrites;
- delete DarkFactory Python instead of mechanically porting it;
- one owner for every runtime/state/git/provider/credential/docs/web concern;
- CI green alone is not completion;
- #68 checkboxes are the merge gate;
- implementation workers do not merge #1009.
