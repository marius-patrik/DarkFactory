# DarkFactory — Final Integration Plan

## 1. Authority and delivery model

DarkFactory is finished through **one issue, one integration branch, one PR, and one final merge**.

- Product architecture: `PRD.md`
- Completion/planning/validation contract: #68
- Integration branch: `finish/darkfactory`
- Integration PR: #1009
- Canonical branch: `darkfactory`

All previously required child Requests have been consolidated into #68 and closed as duplicate/historical traceability. They are not implementation authorities and workers should not need to read them to discover required scope.

Explicit backlog outside this merge is listed in #68 and must not block #1009.

#1009 remains draft until every required #68 checkbox is proven from its exact final head.

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

Final owners are the first-party packages and official capabilities defined by the PRD.

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

Work may run in parallel inside #1009, but all scope and acceptance comes from #68.

1. **Preserve consolidated foundations**
   - graph/runtime work formerly carried by #894;
   - mutation-evidence/conflict-repair work formerly carried by #899;
   - web-shell work formerly carried by #963.

2. **Collapse runtime ownership**
   - finish graph/runtime composition;
   - move reusable harness TypeScript to final owners;
   - finish deterministic git and mutation/re-entry;
   - make df the sole Request-lifecycle engine;
   - delete superseded harness and Python owners.

3. **Finish every remaining unchecked implementation item in #68**
   - hooks/rules;
   - provider OAuth/accounts;
   - CLI/TUI;
   - git/governance;
   - Epic relationships;
   - stacked PRs;
   - recovery intake;
   - web/dashboard;
   - docs/currentness;
   - release packaging.

4. **Repository reduction**
   - remove duplicate/dead owners, workflows, tests, scripts, aliases and stale docs;
   - remove `harness/`;
   - remove DarkFactory Python production code;
   - clean branches/worktrees/stashes/recovery refs after durable disposition.

5. **Release and proof**
   - build one release candidate from the exact #1009 head;
   - prove source-free install;
   - execute every pre-merge proof item in #68;
   - install/test the exact candidate across all six consumers;
   - fix every discovered defect on the same branch and rerun affected proof;
   - only then mark #1009 ready and merge once.

## 6. Merge gate

CI green is necessary but not sufficient.

The checklist in #68 is the gate. No separate child-Request acceptance interpretation exists.

There is no known-defect post-merge stabilization phase. Known defects are fixed before merge.

## 7. Stop condition

Stop only when:

- every required #68 item is proven and #1009 is ready for the coordinator's final merge decision; or
- progress is impossible because of a genuine external authorization/service/unavailable-recovery-data blocker.

Merge conflicts, stale code, red tests, architectural cleanup, missing implementation and agent failures are work, not blockers.
