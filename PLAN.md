# DarkFactory — Canonical Completion Plan

## Purpose

This document is the single cross-Request execution plan for completing `marius-patrik/DarkFactory`.

It defines:

- the final product state;
- cross-Request dependencies and execution order;
- recovery-work ownership;
- production-cutover, release, fleet-migration and final-acceptance gates.

It does **not** duplicate live workflow state, per-Request implementation detail, or transient checkpoints. GitHub Requests, PRs and Actions remain the source for current execution status.

**Canonical branch:** `darkfactory`  
**Parent completion Request:** #68  
**Final fleet acceptance Request:** #361

---

## 1. Source-of-truth hierarchy

Use the following order when information differs:

1. The current Request body defines the requested behavior and explicit acceptance criteria.
2. The latest owner-finalized `darkfactory-final-planning` / `darkfactory-plan` record for that Request defines its approved implementation interpretation.
3. This document defines cross-Request sequencing, program-wide invariants and completion gates.
4. GitHub issue/PR/Actions state defines what is running, blocked, merged or failed **right now**.

`PLAN.md` must not contain workflow run IDs, observed step names, temporary branch heads, “checkpoint supersedes…” sections, or other execution diary material. Those facts age too quickly and belong in GitHub state.

All completion Requests were planning-finalized before execution. If a Request body, accepted behavior, recovery input or dependency contract materially changes, re-review only that Request. Discovery of the concrete current-tree owner for already-approved behavior does not by itself invalidate Planning.

No manual product implementation is authorized as a workaround around the DarkFactory pipeline.

---

## 2. Current durable baseline

The following durable facts define the starting point for the remaining program:

- #414 restored the default-branch bootstrap/CI baseline through merged PR #415 and is terminal.
- #413 is the first unresolved bootstrap dependency: the legacy stage owner must forward the stage's already-known semantic kind into `df run --kind`.
- #365 remains downstream of #413 and owns TypeScript inference when a caller does not declare a kind.
- #340 remains open. Draft PR #407 is an implementation artifact, not accepted completion; it must not merge until the routing bootstrap is corrected and its broad/out-of-scope changes are reconciled.
- The TypeScript graph exists but production is still dual-engine: `agent.yml` still delegates through Python, `df-dispatch.yml` is still shadow-mode, `bin/darkfactory` still launches Python, release/install remain Python-driven, and production shell/`gh` mutation paths still exist.
- The hard-transition contract is not yet repository-wide: graph/runtime state still includes `.df/` directory semantics and JSON run-state persistence.
- The published harness package is still `0.0.0`, private, and points its `df` bin at TypeScript source.
- The preserved `recovery/*` branches remain available and are governed inputs, not permission to bypass the normal Request lifecycle.

This section contains only durable program facts. Live execution state must be read from GitHub.

---

## 3. Final product contract

DarkFactory is complete only when all of these are true together:

1. `df` is the sole production orchestration and mutation engine.
2. The legacy Python automation is not required or invoked by normal production operation.
3. Production GitHub mutations use typed df-owned interfaces; subprocess/shell `gh` mutation paths are gone.
4. The declared graph executes the real Request lifecycle through production handlers, including persisted interruption/resume.
5. `repo.df` and `config.df` obey the #340 hard transition: `.darkfactory/<name>.df` or root `<name>.df`, both-present is an error, legacy paths are not read, and `.df` is a filename extension rather than a directory.
6. Df-managed config/state/result/review/audit artifacts use canonical `.df` filenames with no final JSON/JSONL compatibility aliases.
7. Pipeline stages preserve explicit stage semantics; undeclared callers infer task capabilities from what the current step must do rather than feature nouns.
8. Every df-backed agent stage has one bounded elapsed-time budget across failover and tools, with typed timeout/cancellation outcomes and deterministic recovery.
9. Natural model stop is valid completion; mutation truth is derived from engine-observed effects rather than mandatory submit/JSON rituals or model claims.
10. Recovery intake, deterministic git/rebase/conflict handling, hooks, detected quality, Request/Epic relationships and stacked PRs are first-class df behavior rather than parallel subsystems.
11. The supported CLI/TUI/dashboard/docs surface reflects one current command/state/provider model.
12. The release artifact is publishable and installable without Python, a DarkFactory source checkout, or Bun on the npm execution path.
13. All six intended consumer repositories are migrated by released `df`, not by manual file copying, and pass final drift/governance checks.
14. Documentation, README/PRD, ADRs/notes, rules, generated API docs, dashboard and packaged assets describe the shipped system.
15. `audit.df` independently records the accepted final state.
16. #361 closes green.
17. The original #68 declarable-graph acceptance criteria are re-run against the final installed system and pass.
18. Only then is #68 closed.

A merged PR, closed Request or green unit suite is evidence toward these conditions, not a substitute for them.

---

## 4. Execution protocol for every Request

Before releasing a Request into implementation:

1. Re-fetch the current Request and its latest owner-finalized Planning.
2. Confirm all dependencies in the work map below are terminal or the named recovery milestone is satisfied.
3. Confirm any required recovery source and its exact provenance.
4. Resolve the current canonical base/default branch dynamically.
5. Re-review Planning only if behavior, scope, recovery input or dependency contracts materially changed.
6. Release the normal pipeline gate (`/df approve` or its final equivalent).
7. Keep implementation, detected verification, review/fix, scope-amendment handling, final alignment, checks and merge inside the governed pipeline.
8. Update recovery/provenance/board/run state from the pipeline result.
9. Close the Request only when its own acceptance criteria are actually satisfied.

Where an existing PR/branch is mentioned as recovery evidence, the pipeline may repair, restack or replace it. The master requirement is preservation of valid authorized work plus an explicit disposition of anything rejected or superseded.

---

## 5. Recovery ledger

These preserved branches are already accounted for and must keep the following ownership/disposition:

| Recovery source | Owner / disposition |
|---|---|
| `recovery/pr-376-clean` | #340 recovery/provenance input |
| `recovery/f48-layout` | #340 recovery/provenance input |
| `recovery/f28-dispatch` | Historical #242 provenance only; no unique valid implementation remains |
| `recovery/f14-borrowed-refresh` | #248; unique F14 delta must receive a governed disposition |
| `recovery/f40-capability-tiers` | #331 |
| `recovery/f38-result-capture` | #329, only after #331 |
| `recovery/f42-tsdoc` | #334 multi-source recovery |
| `recovery/f42-tsdoc-w2` | #334 multi-source recovery |
| `recovery/f42-tsdoc-w3` | #334 multi-source recovery |
| `recovery/f42-tsdoc-w4` | #334 multi-source recovery |
| `recovery/f44-readme-prd` | #336 |
| `recovery/f45-adrs` | #337 |
| `recovery/f47-hooks` | #339 |
| `recovery/f49-detected-quality` | #341 migration evidence/seed |
| `recovery/d4-docs-generator` | #335 |
| `recovery/fix-empty-agent-output` | Provenance only; no unique work remains |

Additional holds:

- **#251 TUI:** search surviving Git history/session/recovery evidence before implementation. Import unique state through #388 or record an explicit no-unique-state disposition.
- **#358 F30-4:** perform the same discovery before #358. Import unique state through #388 or record an explicit no-unique-state disposition.
- **#365 rejected branch / PR #366:** evidence only. Reuse exact useful deltas only after reconciling them against the finalized #365 contract.
- **F28:** retain as provenance; do not reopen #242 solely for the historical test difference.
- **F14:** the preserved unique commit is `ffe1f0f`; #248 must not close without a terminal governed disposition for that delta.

Every governed intake records source/ref/snapshot, recovery SHA, canonical base, target Request(s), Planning identity, imported-state hash, secret-scan result, overlap and reconciliation result.

---

## 6. Authoritative work map

This table replaces the old duplicated phase list, dependency diagram, wave list and immediate-action section. Each open completion Request appears once here.

| Order | Request(s) | Requires | Program role / exit condition |
|---|---|---|---|
| A1 | #413 | #414 terminal | Forward the current pipeline stage's existing semantic kind into `df run --kind` without a second router or policy table. |
| A2 | #365 | #413 | Fix undeclared-caller stage-vs-subject inference in TypeScript while preserving deterministic direct artifact intent and sensitivity rules. |
| A3 | #340 | #413, #365 | Finish the `repo.df` / `config.df` / `.df` hard transition. If PR #407 remains the implementation artifact, restack/reconcile it, remove unrelated formatter sweep, make checks/review/alignment green, then merge governedly. |
| A4 | #406 | #340 | Add one df-native elapsed-time budget per logical stage/run, including failover/tools; bootstrap Python forwards the same budget until #359 removes it. |
| A5 | #391 | #406 | Complete the durable unified Planning + review/fix lifecycle, structured context/provenance/staleness, persistence/resume and final alignment using #340-compliant state. |
| A6 | #388 early milestone | #391 | Make governed recovery intake/provenance production-usable before recovery-heavy Requests proceed; #388 stays open until its full contract is later proven. |
| B1 | #248 | #388 early + F14 intake | Governedly reconcile the unique borrowed-credential refresh recovery delta with current account/provider contracts. |
| B2 | #331 | #388 early + F40 intake | Complete capability tiers, minimum-tier routing, single-step escalation/reset and diagnostics. |
| B3 | #341 | #340 + #388 early + F49 intake | Establish one TypeScript detector/quality contract used by doctor, CI, protection, verification and docs. |
| B4 | #252 | #365 | Complete Gemini image/video generation using the live provider/account/routing system; engineering work about modalities must remain ordinary engineering. May run in parallel with other post-#365 lanes. |
| C1 | #329 | #331 + #388 early + F38 intake | Complete natural-stop result capture and engine-observed mutation truth under normal routing/sensitivity/quota rules. |
| C2 | #334 | #341 + #388 early + F42/W2/W3/W4 intake | Reconcile recovered TSDoc against current exports and produce a strict single generated API source. |
| C3 | #339 | #341 + #388 early + F47 intake | Establish one df hook/rule engine reused locally, in lanes and in CI. |
| C4 | #335 | #334 + #341 + #388 early + D4 intake | Publish the harness API and architecture from the same detector/generated API source. |
| C5 | #358 | #329 + #331 + #391 + F30-4 discovery/disposition | Make graph handlers/orchestration production-real: agent/automation/check/gate effects, exactly-once resume, review/fix, alignment and final persistence. |
| C6 | #332 | #358 + #329 + #331 | Add safe parallel fine-grained chunks with isolated worktrees, ordered merge-back, failure isolation and persisted resume. |
| D1 | #384 | #358 + #339 | Complete the deterministic git/rebase/conflict/continue/abort substrate with dirty-tree protection and lease-safe updates. |
| D2 | #317 | #384 + #358 + #341 + #339 | Use the deterministic substrate for branch repair and reject false code-change claims from observed effect evidence, not keywords. |
| D3 | #385 | #358 | Complete the first-class Epic/Request relationship graph and deterministic reconciliation. |
| D4 | #386 | #384 + #358 + #385 + #339 | Complete stacked PR topology, restack/retarget, dependency-aware merge order, conflict resume and audit semantics. |
| D5 | #388 full | #391 + #358 + #384 + #339 + #385 + #386 | Prove the complete governed recovery product with at least one real preserved recovery lane through intake -> Planning -> implementation -> review/fix -> alignment -> merge -> terminal provenance. |
| E1 | #359 | #340 + #406 + #391 + #331 + #329 + #358 + #332 + #341 + #339 + #384 + #317 + #385 + #386 + #388 full | Cut all production mutation/orchestration over to df, activate the real graph, retire Python and shell/`gh` production mutation, and prove a live df-only lifecycle plus persisted resume. |
| F1 | #403 | #359 + #341 | Establish the complete supported operator command surface and one command registry/source of truth. |
| F2 | #251 | #403 + #359 + TUI discovery/disposition | Build the TUI on the shared command registry and final provider/quota/CI APIs; bare interactive `df` enters the TUI while non-DarkFactory invocations still coexist correctly with system `df(1)`. |
| F3 | #390 | #251 + #335 + #341 + #359 | Complete the dashboard/web-UI foundation without duplicating provider/quota/state engines or exposing secrets. |
| F4 | #336 | #339 + #341 + product/runtime surfaces materially final + F44 intake | Enforce docs impact in the real hook/detector owners and rewrite/fact-check README/PRD against shipped reality. |
| F5 | #337 | architecture/product surfaces materially final + F45 intake | Reconcile notes/ADRs, preserve history, mark superseded decisions and eliminate normative contradictions. |
| G1 | #360 | All product/engine/docs Requests above terminal, including #248/#251/#252/#317/#329/#331/#332/#334/#335/#336/#337/#339/#340/#341/#358/#359/#365/#384/#385/#386/#388/#390/#391/#403/#406/#413 | Publish/install the final supported df artifact and prove clean-machine install/update and packaged runtime behavior. |
| G2 | Fleet migration | #360 | Migrate all five non-DarkFactory consumers with the released artifact and re-check DarkFactory itself. Prove idempotency by running install/update twice. |
| G3 | #361 | Fleet migration | Run the six-repository acceptance/audit, produce internally consistent `audit.df`, and close only when every program acceptance condition is green. |
| G4 | #68 | #361 | Re-run the original declarable-graph contract against the final installed system; close only with no required child, unexplained recovery work/PR or legacy alternate production engine. |

Dependency rules are authoritative from this table. Work may run in parallel only when its complete `Requires` set is satisfied and concurrent work does not invalidate the same mutable base/artifact.

---

## 7. Boundary contracts

### 7.1 #340 hard-transition boundary

Before any later runtime/release work may treat naming/storage as stable:

- one resolver owns `repo.df` and `config.df`;
- `.darkfactory/<name>.df` then root is the only supported location pair;
- both-present is an error;
- old manifest/config paths are not read;
- `.df/` directory semantics are gone;
- df-owned run/result/review/config/state artifacts use `.df` filenames in their actual owning locations;
- repository-wide search/tests prove no compatibility alias reads or stale installer/runtime/docs behavior.

### 7.2 #391 lifecycle boundary

The final lifecycle is:

Request/context resolution -> Planning draft -> Planning Review -> automatic planning fix/re-review until clean -> one owner Planning gate -> implementation -> deterministic verification -> implementation review/fix loop -> scope-amendment gate only when needed -> final alignment -> checks -> final merge gate -> merge/reconciliation.

Planning and implementation review should share generic machinery where semantics are genuinely common rather than creating duplicate engines.

### 7.3 #388 recovery boundary

Early #388 is an intake/provenance prerequisite; full #388 is a product acceptance gate.

The full live recovery proof must demonstrate:

recovery provenance -> Request binding -> current Planning context -> reviewed Planning -> execution release -> imported implementation reconciliation -> verification -> review/fix iteration(s) -> optional scope amendment -> final alignment -> checks/review/merge -> terminal provenance.

Recovered bytes never silently bypass gates or overwrite secrets, and stale Planning approval cannot be reused after material imported-state change.

### 7.4 #359 production-cutover boundary

Immediately before cutover, derive a fresh mutation ledger from the **then-current** tree. It must cover at least:

- Request intake and comments;
- Planning/review/gates;
- agent/implementation dispatch;
- PR create/update;
- branch repair;
- implementation review/fix;
- check waiting;
- merge/issue closure;
- board/project reconciliation;
- quota checkpoint/resume;
- failure reporting;
- repository settings/protection;
- workflow install/update;
- install/update and release mutations that remain coupled.

For each mutation record trigger, legacy owner, permissions, side effects, final df owner, unit/integration proof, live proof and deletion/retention rationale.

Do not delete a legacy mutation owner before replacement proof. Close #359 only after:

- `df-dispatch` (or its final renamed equivalent) is the sole mutating production dispatcher;
- the production graph executes real handlers;
- normal production no longer depends on Python orchestration;
- production shell/subprocess GitHub mutation is gone;
- a live df-only Request lifecycle passes;
- a persisted interruption/quota-resume case passes.

Any Python retained after #359 must be explicitly non-mutating, non-orchestrating and unnecessary for normal df operation.

### 7.5 #360 release boundary

The final distribution must provide:

- one real SemVer authority;
- a publishable package;
- an npm path that runs built Node-compatible JavaScript without Bun/source checkout;
- native targets only where CI can build **and execute** them on compatible runners;
- portable verified checksums and source-commit provenance;
- every runtime graph/schema/workflow/skill/TUI/dashboard/native/data asset actually required;
- initial installation without Python or preinstalled df;
- supported update;
- POSIX system-`df` coexistence;
- Windows direct executable behavior;
- no supported legacy Python front door.

Clean-directory smoke must cover at least:

`df --version`, `df status`, `df doctor`, `df route`, `df ci status`, offline-capable `df run`, `df work`, install/update, compatible-TTY TUI launch, and packaged docs/dashboard assets where applicable.

Release automation itself is df-native after #359.

---

## 8. Fleet migration and final acceptance

Resolve consumers by stable GitHub repository identity, not historical name strings.

Current fleet:

1. `DarkFactory`
2. `omnis`
3. `ChessWithQuests`
4. `OdbornaPrace-paper` (historical `OdbornaPrace`)
5. `template-OdbornaPrace`
6. `OdbornaPrace-mono` (historical `mono-OdbornaPrace`)

The five non-DarkFactory consumers must be migrated with released `df`. DarkFactory must also pass final install/update drift checks.

Per repository, final migration/doctor/audit covers:

- stable repository ID and current canonical name;
- SHA/default branch;
- df release version and source commit;
- `repo.df` / `config.df` resolution;
- managed-file drift;
- workflow pins;
- branch protection and required checks;
- detected test/lint/format/docs actions;
- credential/provider/account diagnostics without secret exposure;
- board reconciliation;
- Request/Epic and stack graphs;
- docs/build/deploy behavior;
- install/update idempotency.

No manual copy-based migration counts as final evidence.

### `audit.df`

#361 produces a machine-readable `audit.df` containing at minimum:

- df version and source commit;
- all six stable repository IDs/current names/SHAs/default branches;
- repo/config and state-naming evidence;
- doctor/drift/workflow/protection/required-check results;
- detected verification actions;
- board, Request/Epic and stack audits;
- git/conflict/resume evidence;
- complete recovery ledger and dispositions;
- #388 live-import provenance;
- Planning identities/approvals and implementation review/fix/alignment evidence;
- #359 zero-legacy-production-dependency proof;
- release/platform smoke;
- dashboard/docs/rules/API/skills evidence;
- released-df-only E2E and resume evidence;
- remaining Request/PR audit.

#361 closes only when this artifact is internally consistent and all required checks are green.

---

## 9. Final #68 closure

After #361 is terminal green, re-run the original #68 contract against the **installed released product**:

- one authoritative node/edge workflow declaration;
- consumer node changes do not require hand-editing duplicated workflow YAML;
- graph validation rejects cycles, unknown nodes and unreachable required checks;
- generated/managed workflow rendering is deterministic;
- regenerated workflow diff is clean;
- intentionally external/static checks are represented consistently through graph/check-reference semantics rather than drifting duplicated automation.

Then confirm:

- no required child Request remains open;
- no recovery source lacks a terminal disposition;
- no unexplained implementation PR/local-only work remains;
- no alternate legacy production engine remains;
- #361 is closed green.

Only then close #68.

---

## 10. Regressions the program must not reintroduce

- `.darkfactory/manifest.json`
- `.github/darkfactory.json` as the final consumer contract
- `.darkfactory/df/config.json`
- `.df/` directories
- hard-coded `main`
- a second provider/model catalog
- a second git engine
- a second hook engine
- a second Request/Epic state model
- a second stack state model
- a second Planning/review engine
- keyword-based mutation-truth validation
- mandatory task-level submit/JSON completion
- subprocess/shell `gh` production mutation
- Python as the production orchestration engine
- source-tree-only installation
- fixed historical test counts as acceptance
- historical repository names as stable identity
- manual consumer-file copying as final installation proof
- manual recovery merging outside the governed pipeline
- treating a merged PR or closed issue as proof beyond its actual acceptance evidence

---

## 11. Maintenance rule for this file

Update `PLAN.md` only when one of these changes:

- a cross-Request dependency;
- a program-wide invariant;
- a recovery owner/disposition;
- a boundary/final acceptance contract;
- the set of Requests required for completion.

Do **not** append checkpoints when a run starts, a workflow step changes, a PR head moves, or a Request merely changes live status. Those transitions are tracked by GitHub and should not turn the master plan back into an execution log.
