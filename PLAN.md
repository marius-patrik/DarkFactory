# DarkFactory — Final Integration Plan

## 1. Authority and delivery model

DarkFactory is finished through **one integration branch and one final merge**.

- Canonical branch: `darkfactory`
- Integration branch: `finish/darkfactory`
- Integration PR: #1009
- Authoritative completion/validation contract: #68
- Product architecture: `PRD.md`

#68 is the planning and validation contract. Child Requests remain traceability records only.

No required child Request receives its own final merge. #1009 remains draft until the complete system is proven from its exact head.

Backlog work excluded from #1009 is recorded explicitly in #68 and must not block the merge.

## 2. Finish directly

This is not a migration program.

Do not build or preserve:

- compatibility layers;
- Python/TypeScript parity;
- shadow or canary engines;
- staged production cutovers;
- duplicate runtime owners;
- temporary architecture merely to keep intermediate commits independently production-ready.

The integration branch may pass through temporary internal states. Canonical receives the finished system once.

## 3. Harness strategy: move, do not rewrite

`harness/` contains substantial working TypeScript. Treat it as implementation to **relocate**, not a subsystem that must be rewritten.

For each useful harness area:

1. identify its final PRD owner;
2. move/reuse the implementation with minimal behavioral change;
3. fix imports, exports and final interfaces;
4. merge any duplicate final-owner implementation;
5. delete the harness copy immediately.

Final production code must not import back into `harness/`.

Target owners are the final first-party packages and official capabilities:

- `@darkfactory/protocol`
- `@darkfactory/core`
- `@darkfactory/capability`
- `@darkfactory/github`
- `@darkfactory/keychain`
- `@darkfactory/auth`
- `@darkfactory/docs`
- `@darkfactory/cli`
- `@darkfactory/web`
- official capabilities such as git, GitHub, planning, review, CI, release, recovery, hooks, epics and stacks.

The intended final repository has no production ownership in `harness/`; delete the directory once all unique required behavior has a final owner.

## 4. Python strategy: delete the DarkFactory implementation

Do not mechanically port the legacy Python orchestration.

Use Python code only as a behavior inventory, cover any still-required behavior through the final TypeScript/Bun runtime/packages/capabilities, then delete the obsolete Python implementation.

Expected removal once covered:

- Python agent runner;
- obsolete `.github/scripts/*.py` production automation;
- obsolete Python tests;
- DarkFactory's own `pyproject.toml` and `requirements-dev.txt`;
- Python runtime/setup from the DarkFactory agent container when no final runtime need remains.

This does **not** remove support for Python consumer repositories. Detection/CI/capabilities must still run Python quality/build actions when a consumer repository requires them.

The production path becomes:

```text
GitHub event
  -> df dispatch
  -> persisted runGraph
  -> typed production handlers
  -> deterministic Git/GitHub/capability effects
  -> verification/review/check/merge/reconciliation
```

No Python supervisor remains around df.

## 5. Integrated implementation order

Work may run in parallel inside #1009, but converge in this order where interfaces depend on one another:

1. **Consolidated foundations already imported**
   - #358 graph/runtime from former PR #894;
   - #317 mutation evidence/conflict repair from former PR #899;
   - #425 web shell from former PR #963.

2. **Collapse runtime ownership**
   - finish graph/runtime composition;
   - move reusable harness TypeScript to final owners;
   - finish deterministic git and mutation/re-entry;
   - make df the sole Request-lifecycle engine;
   - delete superseded harness and Python owners.

3. **Finish required product surfaces**
   - hooks/rules;
   - provider OAuth/accounts;
   - CLI/TUI;
   - deterministic git;
   - Epic relationships;
   - stacked PRs;
   - recovery intake;
   - web/dashboard;
   - docs/currentness.

4. **Repository reduction**
   - remove duplicate/dead owners, workflows, tests, scripts, aliases and stale docs;
   - remove `harness/`;
   - remove DarkFactory Python production code;
   - clean branches/worktrees/stashes/recovery refs after durable disposition.

5. **Release and proof**
   - build one release candidate from the exact #1009 head;
   - prove source-free install;
   - run all #68 pre-merge acceptance;
   - install/test the exact candidate across all six consumers;
   - fix every discovered defect on the same branch and rerun affected proof;
   - only then mark #1009 ready and merge once.

## 6. Merge gate

CI green is necessary but not sufficient.

Before #1009 may merge, every required checkbox in #68 must be backed by observed evidence from the exact final PR head, including:

- graph interruption/resume and effect idempotency;
- conflict repair and actual graph re-entry;
- fail-closed mutation truth;
- real df-only governed Request lifecycle;
- hooks/governance;
- provider/account/keychain boundaries;
- CLI/TUI;
- web/docs;
- recovery;
- Epic/stack behavior;
- source-free release/install;
- six-consumer fleet acceptance;
- final repository/ref cleanup.

There is no known-defect post-merge stabilization phase. Known defects are fixed before merge.

## 7. Stop condition

Stop only when:

- #1009 is fully proven, ready, and merged; or
- progress is impossible because of a genuine external authorization/service/unavailable-recovery-data blocker.

Merge conflicts, stale code, red tests, architectural cleanup, missing implementation and agent failures are work, not blockers.
