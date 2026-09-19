# DarkFactory — Canonical Completion Plan

## Purpose

This is the durable cross-Request execution plan for completing DarkFactory.

It defines:

- the remaining critical path to self-hosting;
- which work may proceed in parallel;
- recovery ownership and disposition;
- merge/cutover/release/fleet gates;
- the final acceptance path through #361 and #68.

It does **not** contain workflow run IDs, temporary branch heads, execution diaries or per-run checkpoints. GitHub issues, PRs and Actions remain the source of live execution state.

**Canonical branch:** `darkfactory`  
**Parent completion Epic:** #68  
**Final fleet acceptance:** #361

---

## 1. Authority

When sources differ, use this order:

1. `PRD.md` for current product requirements and architecture.
2. Current Request body for feature-specific accepted behavior.
3. Accepted ADRs under `.agents/notes/adr/`.
4. Latest owner-finalized `darkfactory-final-planning` for the affected Request.
5. This file for cross-Request sequencing, optimization, recovery ownership and final gates.
6. GitHub issue/PR/Actions state for live execution status.

Material product or architecture changes update PRD/ADR/Request state before implementation. Concrete current-tree ownership discovered during implementation does not invalidate Planning unless behavior or architecture changes.

---

## 2. Durable baseline

The bootstrap baseline has advanced since the previous plan revision.

### Satisfied prerequisites

- #414 is terminal and restored the original bootstrap/CI baseline.
- #431 is terminal and synchronized governance/docs tests and projections with the accepted architecture.
- #413 is terminal through PR #428 / commit `6570769bc1d566a6386e7d555d7a06e41d2285f8`.
  - Declared pipeline stage kind now reaches `df run --kind`.
  - The rejected duplicate Python TaskKind design was not retained.
  - #365 is now the first unsatisfied critical-path Request.

These completed bootstrap items are not repeated in the active Request map below.

### Stale implementation artifacts

- PR #407 is **not** the merge vehicle for #340. It predates the architecture convergence, is broadly contaminated by unrelated changes, and remains useful only as implementation/recovery evidence together with PR376/F48.
- The surviving #365 feature branch is a rejected/stale implementation branch. It may provide useful deltas in `router/profile.ts` / `router/types.ts`, but it is not approved implementation and must be reconciled against current #365 Planning.

### Current architectural foundation

ADR-0017 through ADR-0020 and Requests #420–#425 define the final package/capability, docs/web and auth/keychain architecture.

The product target remains:

- root Bun workspace;
- first-party packages `protocol/core/capability/github/keychain/auth/docs/cli/web`;
- agentic/product behavior as versioned capabilities;
- `code`, `paper`, `math` retained as semantic domains;
- first-party docs engine and one shared web application;
- GitHub-backed web control plane;
- strict separation of browser auth and machine keychain custody.

The old monolithic `@darkfactory/harness` layout is migration input only.

### Production state

The system is still pre-cutover:

- Python remains part of normal production orchestration;
- production GitHub mutation is not yet fully df-owned;
- df-dispatch is not yet the sole production mutating path;
- #359 therefore remains the primary program milestone.

---

## 3. Execution rules

### 3.1 Start-work dependencies are not merge dependencies

A Request may begin recovery analysis, implementation or tests before every merge dependency lands when:

- its behavioral contract is settled;
- work can be isolated;
- unresolved interfaces are explicit;
- final merge waits for the interfaces it actually consumes.

Do not idle independent work because another branch is unfinished.

### 3.2 Merge dependencies are not final-acceptance dependencies

A feature may merge before unrelated final-product capabilities exist. Final release/fleet acceptance is a separate gate.

### 3.3 Recovery work is existing implementation

Preserved recovery refs are starting implementation, not inspiration.

For each recovery lane:

1. inspect exact preserved state;
2. compare with current `darkfactory`;
3. retain valid behavior/tests;
4. reject stale assumptions explicitly;
5. adapt the remaining delta into its **final package/capability home**;
6. record a terminal integrated/superseded/rejected disposition.

Do not regenerate valid recovered work from scratch.

### 3.4 Bootstrap-authoring exception

Until #359 closes, direct authoring is permitted only when the current pipeline defect prevents the pipeline from correctly repairing the bootstrap/architecture needed for self-hosting.

It never waives:

- Request coverage;
- finalized Planning;
- tests;
- review/alignment;
- PR/check/merge gates;
- recovery provenance.

The exception expires permanently at #359.

### 3.5 CI concurrency rule

A red canonical/default branch is a repository-wide stop-the-line event.

A failing topic/recovery branch blocks that branch and dependent work, but does not block unrelated isolated work whose own required checks are green.

---

## 4. Recovery ledger

| Recovery source | Final owner / disposition |
|---|---|
| `recovery/pr-376-clean` | #340 evidence/input |
| `recovery/f48-layout` | #340 / #420 evidence/input |
| PR #407 | #340 evidence only; do not repair/merge wholesale |
| `recovery/f28-dispatch` | Historical #242 provenance; no unique valid implementation |
| `recovery/f14-borrowed-refresh` | #248 -> #422 keychain |
| `recovery/f40-capability-tiers` | #331 |
| `recovery/f38-result-capture` | #329 |
| `recovery/f42-tsdoc` | #334 -> #424 |
| `recovery/f42-tsdoc-w2` | #334 -> #424 |
| `recovery/f42-tsdoc-w3` | #334 -> #424 |
| `recovery/f42-tsdoc-w4` | #334 -> #424 |
| `recovery/f44-readme-prd` | #336 |
| `recovery/f45-adrs` | #337 |
| `recovery/f47-hooks` | #339 hooks capability |
| `recovery/f49-detected-quality` | #341 migration seed |
| `recovery/d4-docs-generator` | #424 / #335 |
| `recovery/fix-empty-agent-output` | Provenance only; fully subsumed |
| rejected #365 branch / PR #366 | Optional implementation evidence only |

Additional discovery obligations:

- #251: locate/preserve any unique prior TUI implementation before replacement work.
- #358: locate/preserve any unique F30-4 orchestration implementation before replacement work.

Full #388 productization is **not** required to consume already-preserved refs. It remains the reusable recovery-product/live-E2E acceptance.

Every recovery source must have an explicit terminal disposition before #361.

---

## 5. Active critical path to self-hosting

#413 is complete. The remaining merge path to the earliest safe #359 cutover is:

```text
#365  task-profile inference
  ↓
#420  root workspace / final package boundaries
  ↓
#421  minimum capability ABI + loader
  ↓
#340  final repo.df/config.df/.df hard transition
  ↓
#406  bounded elapsed-time runtime
  ↓
#391  durable unified Planning/review lifecycle
  ↓
#422  production-critical keychain migration
  ↓
#331  capability-tier routing
  ↓
#329  natural-stop result capture
  ↓
#341  package/domain detection + capability quality actions
  ↓
#358  production graph handlers / durable resume
  ↓
#317  truthful branch-repair / mutation evidence
  ↓
#359  df-only production cutover
```

This is a **merge/cutover path**, not a rule that all development must happen serially.

### Immediate development concurrency

The following may be worked now in parallel:

- #365 implementation/reconciliation;
- #420 workspace/package implementation;
- #421 ABI design against the emerging #420 shape;
- #340 clean convergence from current trunk + PR376/F48/#407 evidence;
- #406 runtime-budget implementation;
- #391 lifecycle completion;
- all recovery analysis/reconciliation;
- #422 keychain recovery/migration design;
- #331 F40 reconciliation;
- #341 F49 reconciliation and detector/capability-action design;
- #423 auth;
- #424 docs engine;
- #425 web shell.

Merge only when each lane's actual interfaces are stable.

### Important merge constraints

- #420 may be implemented now, but final integration waits for #365's router/task-profile interface to be stable.
- #421 minimum ABI/loader merges on the final #420 workspace.
- #340 is rebuilt cleanly on the final package ownership; PR #407 is not carried forward wholesale.
- #406 may be authored now but merges against final core/runtime ownership and #340 naming.
- #391 may be authored now but merges on final #340/#406 persistence/runtime contracts.
- #422 must provide the credential subset needed by the production engine before #359; non-critical keychain breadth may continue later.
- #331/#329 recovery work may be prepared before their final package locations land.
- #341 must consume the #420/#421 package/capability model rather than creating a new central hard-coded action table.

---

## 6. #359 cutover boundary

#359 is intentionally an **early self-hosting cutover**, not the final product-completion gate.

It does **not** wait for #332, #384, #385, #386, #388 full, TUI, docs/web completion or final release polish unless current implementation proves one of them is actually required for the core Request lifecycle.

Immediately before cutover, derive a fresh mutation ledger covering at least:

- Request intake/comments;
- Planning/review/gates;
- agent dispatch;
- PR create/update;
- branch repair;
- checks;
- implementation review/fix;
- merge/closure;
- board reconciliation;
- quota checkpoint/resume;
- failure reporting;
- settings/workflow mutation still required by the core lifecycle.

Close #359 only when all are true:

1. df is the sole mutating production dispatcher for the core lifecycle.
2. Production graph handlers are real, not shadow-only.
3. The live lifecycle uses #391 unified Planning.
4. A real df-only Request lifecycle succeeds end to end.
5. Persisted interruption/resume succeeds.
6. Normal production no longer requires Python orchestration.
7. Normal production no longer requires shell/subprocess GitHub mutation.

At #359:

- the bootstrap-authoring exception expires;
- remaining completion work must run through the real df-native system.

---

## 7. Parallel work outside the cutover path

These Requests should not unnecessarily slow #359.

### Provider/runtime extension

- #248 — F14 OAuth/keychain recovery; complete with #422/final release.
- #252 — Gemini image/video generation; proceed once #365/#421 interfaces are usable.
- #332 — safe parallel fine-grained chunks; final after #358/#329/#331.

### Delivery/governance capabilities

Preparation may begin before cutover; final implementation should use the self-hosted system where practical:

- #339 — hooks capability from F47;
- #384 — deterministic git/rebase/conflict capability;
- #385 — Epic/Request relationship capability;
- #386 — stacked PR capability;
- #388 — full reusable governed recovery product.

### Operator surfaces

- #403 — final composed CLI/command registry;
- #251 — TUI, recovery-first;
- #423 — human/browser GitHub auth;
- #425 — shared prebuilt web application;
- #390 — quota/operator dashboard surfaces on #425.

### Documentation

- #424 — first-party docs compiler/content graph;
- #334 — complete TSDoc/export coverage from F42;
- #335 — generated API/architecture publication;
- #336 — generated README + docs-impact enforcement from F44;
- #337 — final ADR/notes reconciliation from F45.

---

## 8. Self-hosted completion wave

After #359, finish remaining product work through df itself.

Independent lanes should run concurrently subject to real interface dependencies:

```text
git/hooks/governance     operator surfaces       docs/web
--------------------     -----------------       ----------------
#339 hooks               #403 CLI registry       #423 auth
#384 git                 #251 TUI                #424 docs
#385 epics               #248 auth/keychain      #334 TSDoc
#386 stacks              #252 multimodal         #335 API docs
#388 recovery full       #332 parallelism        #425 web
                                                #390 dashboard
                                                #336 README/docs-impact
                                                #337 ADR reconciliation
```

Do not reintroduce a serial "finish one entire column first" schedule.

---

## 9. Distribution

### Versioning

First-party packages and official capabilities initially use one lockstep DarkFactory SemVer.

The capability ABI has its own compatibility version.

### Namespace

The intended GitHub Packages namespace is the planned `darkfactory` GitHub organization.

### Standard installation

The normal df installation is batteries-included with official capabilities while third-party capabilities use the same loader/ABI.

### Canary

As soon as #359 is complete, publish a canary/pre-release sufficient to test:

- source-free install;
- package resolution;
- official capability loading;
- update behavior;
- one real consumer;
- GitHub Packages mechanics;
- prebuilt web bundle deployment.

The canary is feedback, not #360 final acceptance.

### #360 final release

Final distribution must include, where applicable:

- Node-compatible npm execution;
- supported native artifacts with native smoke tests;
- version/source provenance and checksums;
- official capabilities;
- generated MCP/plugin/skill forms;
- required graph/schema/runtime assets;
- prebuilt DarkFactory Web bundle;
- source-free install/update.

No final Python front door or source checkout requirement.

---

## 10. Fleet and final acceptance

The final fleet is resolved by stable GitHub repository identity:

1. DarkFactory
2. omnis
3. ChessWithQuests
4. OdbornaPrace-paper
5. template-OdbornaPrace
6. OdbornaPrace-mono

After #360:

1. migrate the five non-DarkFactory consumers using released df;
2. re-check DarkFactory through the same install/update contract;
3. run install/update twice to prove idempotency;
4. verify package/domain/capability detection, workflows, protection, checks, docs/web/auth and recovery provenance;
5. produce `audit.df`;
6. close #361 only when the six-repo audit is internally consistent and green;
7. rerun the original #68 declarable-graph contract against the installed release;
8. close #68 only when no required child, unexplained recovery source, unexplained implementation PR or legacy alternate production engine remains.

---

## 11. Active Request map

Only still-open completion Requests are listed here. Satisfied bootstrap Requests #413/#414 and completed baseline repair #431 are intentionally omitted.

| Request | Start now? | Merge / completion gate |
|---|---|---|
| #365 | yes | current Planning; reconcile stale branch; green task-profile semantics |
| #420 | yes | #365 interface stable; workspace/package boundary green |
| #421 | yes | #420 final workspace; minimum ABI/loader green |
| #340 | yes | #420/#421 ownership stable; hard-transition proof |
| #406 | yes | final core ownership + #340 naming |
| #391 | yes | #340/#406 persistence/runtime contracts |
| #422 | yes | #420/#421 package boundaries + F14 reconciliation; production subset before #359 |
| #331 | yes | F40 reconciled into final router/core owner |
| #329 | yes | #331 final behavior + F38 reconciliation |
| #341 | yes | #420/#421/#340; capability-driven quality/action model |
| #358 | yes | F30-4 disposition + #329/#331/#391 |
| #317 | prepare | #358 + #341 truthful observed-effect path |
| #359 | prepare ledger | core critical path above |
| #248 | yes | #422 + terminal F14 disposition |
| #252 | prepare | #365/#421 usable interfaces |
| #332 | prepare | #358/#329/#331; preferably self-hosted |
| #339 | yes | F47 + #421/#341 final owners |
| #384 | prepare | #358 persisted conflict/run model |
| #385 | prepare | #358 Request/state owner |
| #386 | prepare | #384/#385/#358 |
| #388 | yes | full product exits on #391/#358/#384/#385/#386 + live recovery E2E |
| #403 | prepare | #420/#421 command contract; final after #359 |
| #251 | recovery now | #403 + recovered TUI reconciliation |
| #423 | yes | #420 protocol/github boundary; auth tests |
| #424 | yes | #420/#421 + D4/F42/F44 reconciliation |
| #334 | recovery now | final exports + #424 extraction |
| #335 | recovery now | #424/#334/#341 |
| #425 | yes | #423 auth + #424 content boundary |
| #390 | prepare | #425 shell + shipped quota/provider protocol |
| #336 | recovery now | #424 README renderer + #339/#341 docs-impact owners |
| #337 | recovery now | architecture/product materially final |
| #360 | canary after #359 | all required final product Requests terminal |
| #361 | prepare audit schema | six-repo released-df migration green |
| #68 | final only | #361 + original graph acceptance green |

---

## 12. Regressions that must not return

- legacy manifest/config paths as final contracts;
- `.df/` directories;
- hard-coded `main`;
- final monolithic `@darkfactory/harness`;
- duplicate provider/model catalogs;
- duplicate credential/keychain systems;
- provider/capability-owned raw secret storage;
- a second web RBAC/state database;
- duplicate git/hook/Request-Epic/stack/Planning-review engines;
- hard-coded repository-specific quality tables where capabilities should contribute actions;
- mandatory task submit/JSON completion;
- keyword/model-claim mutation truth;
- production shell `gh` mutation;
- Python production orchestration;
- ProperDocs/MkDocs as final docs runtime;
- separate docs/dashboard frontends;
- per-consumer React builds;
- independently maintained README product content;
- manual consumer installation as final proof;
- manual recovery merge outside governed delivery;
- fixed historical test counts as acceptance.

---

## 13. Maintenance rule

Update `PLAN.md` only when one of these changes:

- a durable architecture decision;
- a cross-Request start/merge/final dependency;
- recovery ownership/disposition;
- #359 cutover requirements;
- release/fleet/final acceptance;
- the set of Requests required for completion;
- a prerequisite becomes permanently satisfied and keeping it in the active plan would misrepresent the remaining critical path.

Do not append transient workflow/PR/run checkpoints. GitHub already owns live execution state.
