# DarkFactory — Canonical Completion Plan

## Purpose

This is the durable cross-Request execution plan for completing DarkFactory.

It defines:

- the remaining critical path to the final version;
- which work may proceed in parallel;
- recovery ownership and disposition;
- merge/engine-completion/release/fleet gates;
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
- #413 is terminal: declared pipeline stage kind reaches `df run --kind` without a duplicate Python task taxonomy.
- #365 is terminal: task-profile inference is now part of the settled routing foundation.
- #406 is terminal: one bounded elapsed-time budget is enforced across a df run/stage.
- #420 is terminal: the root Bun workspace and first-party package boundaries are established.
- #421 is terminal: the minimum versioned capability ABI/loader exists, including official code/paper/math capability packages and generated adapter contracts.
- #340 is terminal: the final `repo.df`/`config.df`/df-managed `.df` naming and persistence contract is in force.
- #391 is terminal: the unified reviewed Planning lifecycle and review/fix semantics are landed.
- #331 is terminal: capability-tier routing, exact one-tier escalation and final router behavior are landed.

These completed foundations are not repeated in the active Request map below.

### Stale implementation artifacts

- PR #407 is closed and superseded. It remains #340 recovery evidence only together with PR376/F48.
- The rejected #365 implementation branch / PR #366 is terminal evidence only. #365 itself is complete and no further reconciliation is required from that branch.

### Current architectural foundation

ADR-0017 through ADR-0020 and Requests #420–#425 define the final package/capability, docs/web and auth/keychain architecture.

Already landed:

- root Bun workspace;
- first-party package identities `protocol/core/capability/github/keychain/auth/docs/cli/web`;
- browser-safe protocol/GitHub boundaries;
- versioned capability ABI/loader;
- official `code`, `paper`, and `math` capability packages.

Still to converge:

- #422 completes broader machine-keychain consolidation and removes remaining migration facades; its production-critical credential ownership slice is already landed through #523 and is no longer a #359 blocker;
- #423 implements browser/human GitHub auth in `@darkfactory/auth`;
- #424 replaces ProperDocs/MkDocs with the first-party docs engine;
- #425 provides the shared prebuilt GitHub-backed web application;
- remaining runtime ownership must leave the temporary monolithic harness shim as later owner Requests land.

The final product still requires first-party docs, one shared web application, GitHub-backed control-plane behavior, and strict browser-auth versus machine-keychain separation.

### Rebuild state

The repository still contains legacy Python orchestration, but it is no longer a compatibility target.

- final behavior is implemented directly in the TypeScript/package/capability system;
- legacy Python is behavioral/recovery evidence and deletion-bound code;
- do not spend work keeping both engines operational;
- when a final TypeScript owner exists, retire the legacy owner instead of updating both;
- #359 remains the primary core milestone because it proves the rebuilt production engine is complete enough to own the lifecycle and removes the remaining legacy production path.

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

### 3.4 Direct rebuild rule

Until the rebuilt df pipeline is complete, implementation may be authored directly when that is the fastest safe path to the final architecture.

This is not a compatibility exception: there is no requirement to keep the legacy Python engine operational while rebuilding.

Direct authorship never waives:

- Request coverage;
- finalized Planning;
- tests of the final implementation;
- review/alignment;
- PR/check/merge gates;
- recovery provenance.

Once df can reliably own its own development lifecycle, use it for the remaining work.

### 3.5 No supported production-migration phase

DarkFactory is being completed directly in its final architecture.

- There is no required supported legacy-to-df production migration, dual-engine compatibility window, shadow-parity phase, staged cutover, rollback compatibility layer or migration-tooling milestone.
- Historical #242 shadow/parity work is evidence only. It is not a dependency of #359 and must not be recreated or extended.
- Legacy Python and recovered historical implementations are inspected only to preserve required behavior and provenance; they are not compatibility targets.
- Implement missing behavior directly in the final TypeScript package/capability owner, then delete or retire the legacy owner as soon as the final owner is sufficient.
- Do not create adapters, aliases, tests, workflows or operational paths solely to keep obsolete production behavior supported during the rebuild.
- A canary/pre-release may be produced opportunistically when it accelerates packaging feedback, but it is never a mandatory phase between engine completion and the final release.
- Fleet work validates clean install/update of the final release; it does not require supported migration from legacy production.

The optimization target is the shortest safe path to the final #360/#361/#68 end state while preserving required behavior, recovery provenance, deterministic verification and governance.

### 3.6 CI concurrency rule

A red canonical/default branch is a repository-wide stop-the-line event.

A failing topic/recovery branch blocks that branch and dependent work, but does not block unrelated isolated work whose own required checks are green.

---

## 4. Recovery ledger

| Recovery source | Final owner / disposition |
|---|---|
| `recovery/pr-376-clean` | #340 evidence/input |
| `recovery/f48-layout` | #340 / #420 evidence/input |
| PR #407 | Closed/superseded; #340 evidence only |
| `recovery/f28-dispatch` | Historical #242 provenance; no unique valid implementation |
| `recovery/f14-borrowed-refresh` | Production-critical semantics integrated through #422/#523; retain provenance until final recovery audit |
| `recovery/f40-capability-tiers` | Integrated through #331; retain provenance until final recovery audit |
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
| rejected #365 branch / PR #366 | Terminal rejected evidence; #365 completed |

Additional discovery obligations:

- #251: locate/preserve any unique prior TUI implementation before replacement work.
- #358: locate/preserve any unique F30-4 orchestration implementation before replacement work.

Full #388 productization is **not** required to consume already-preserved refs. It remains the reusable recovery-product/live-E2E acceptance.

Every recovery source must have an explicit terminal disposition before #361.

---

## 5. Active critical path to final engine completion

The bootstrap/package/runtime foundations (#413, #365, #406, #420, #421), final hard transition (#340), unified Planning lifecycle (#391), and capability-tier routing (#331) are complete.

The remaining hard dependency spine to the #359 rebuilt-engine completion gate is:

```text
#329  natural-stop result capture ───┐
                                    ├─> #358  production graph handlers / durable resume
#341  capability-driven quality ────┘       ↓
                                            #317  truthful branch-repair / mutation evidence
                                              ↓
                                            #359  df production engine complete
```

This graph is a **merge/engine-completion dependency graph**, not a serial development schedule. #329 and #341 should progress concurrently. #358 recovery analysis may also proceed while they finish, but its final implementation/merge must consume their landed contracts. The production-critical #422 credential slice is already satisfied by #523 and is no longer part of this spine.

### Immediate development concurrency

The following should proceed in parallel where interfaces allow:

- #329 F38 recovery reconciliation and natural-stop result capture, now unblocked by landed #331;
- #341 F49 reconciliation and capability-driven package/domain quality actions;
- remaining #422 keychain breadth independently of the cutover path; the #359-critical ownership slice is already landed through #523;
- #358 F30-4 discovery/recovery analysis against the landed #391/#331 contracts, without inventing a substitute result or verification protocol before #329/#341 land;
- all remaining recovery analysis/reconciliation;
- #423 auth;
- #424 docs engine;
- #425 web shell;
- direct deletion/replacement of legacy Python responsibilities as soon as their final owners exist.

Merge only when each lane's actual interfaces are stable.

### Important merge constraints

- #329 consumes the landed #331 router/escalation behavior and reconciles F38 into the final natural-stop contract.
- #341 consumes the landed #340 naming contract and #420/#421 package/capability model rather than creating a new central hard-coded action table.
- #358 consumes the landed #391 lifecycle, #331 routing, final #329 result-capture behavior and final #341 verification/action contract; F30-4 receives an explicit disposition before replacement work.
- #317 consumes the production graph/verification path from #358/#341 and completes the truthful branch-repair/mutation-observation path required by #359.
- #422's production-engine credential prerequisite is satisfied by #523; remaining keychain breadth is independent of #329/#341/#358/#359.
- At every step, prefer replacing/deleting a Python owner over making it compatible with the rebuilt TypeScript owner.

---

## 6. #359 rebuilt-engine completion/deletion boundary

#359 is intentionally a **core rebuilt-engine completion/deletion gate**, not the final product-completion gate and not a production-migration milestone.

There is no required dual-engine transition period, compatibility window or staged cutover. Legacy Python should be deleted as its final TypeScript replacements land.

#359 does **not** wait for #332, #384, #385, #386, #388 full, TUI, docs/web completion or final release polish unless current implementation proves one of them is actually required for the core Request lifecycle.

Before #359 closes, use a mutation-responsibility ledger as a completeness checklist covering at least:

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
2. Production graph handlers are real.
3. The lifecycle uses #391 unified Planning.
4. A real df-only Request lifecycle succeeds end to end.
5. Persisted interruption/resume succeeds.
6. Legacy Python orchestration is deleted or unreachable from normal production.
7. Normal production no longer requires shell/subprocess GitHub mutation.
8. No responsibility exists only in the retired Python engine.

Independent final-product work does not wait for #359 when its interfaces are stable. After #359, use the real df-native system for remaining work wherever that is the fastest path.

---

## 7. Parallel final-version work outside the core-engine path

These Requests should proceed in parallel whenever their interfaces are stable and should not be serialized behind #359 unless they genuinely depend on it.

### Provider/runtime extension

- #248 — F14 OAuth/keychain recovery; complete with #422/final release.
- #252 — Gemini image/video generation; proceed once #365/#421 interfaces are usable.
- #332 — safe parallel fine-grained chunks; final after #358/#329/#331.

### Delivery/governance capabilities

Preparation and implementation may begin before #359; use the self-hosted system when available, but do not wait for #359 solely to preserve a sequencing narrative:

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

## 8. Final completion wave

Remaining product work may already be running in parallel before #359. Once #359 lands, continue it through df itself where that is the fastest path; #359 is not a start gate for unrelated final-version work.

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

### Optional packaging smoke / pre-release

Use a canary or pre-release only when it accelerates discovery of packaging/consumer/web deployment problems. It is **not** a mandatory phase and must not delay direct work on the final release.

When useful, it may test:

- source-free install;
- package resolution;
- official capability loading;
- update behavior;
- one real consumer;
- GitHub Packages mechanics;
- prebuilt web bundle deployment.

This smoke artifact is disposable feedback, not a supported migration release, not a compatibility promise and not a prerequisite for #360 if equivalent final-release verification is already available.

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

1. install the final released df into the five non-DarkFactory consumers without adding legacy-production migration compatibility;
2. re-check DarkFactory through the same install/update contract;
3. run install/update twice to prove idempotency;
4. verify package/domain/capability detection, workflows, protection, checks, docs/web/auth and recovery provenance;
5. produce `audit.df`;
6. close #361 only when the six-repo audit is internally consistent and green;
7. rerun the original #68 declarable-graph contract against the installed release;
8. close #68 only when no required child, unexplained recovery source, unexplained implementation PR or legacy alternate production engine remains.

---

## 11. Active Request map

Only still-open completion Requests are listed here. Completed foundations #413/#414/#365/#406/#420/#421, baseline repair #431, hard transition #340, unified Planning #391 and capability-tier routing #331 are intentionally omitted.

| Request | Start now? | Merge / completion gate |
|---|---|---|
| #422 | yes | broader importer/login/redaction/diagnostics convergence + final facade removal; production-critical #359 subset already satisfied by #523 |
| #329 | yes | landed #331 behavior + F38 reconciliation |
| #341 | yes | landed #340/#420/#421 contracts; capability-driven quality/action model |
| #358 | recovery now | F30-4 disposition + final #329/#341 + landed #331/#391 |
| #317 | prepare | #358 + #341 truthful observed-effect path |
| #359 | prepare ledger now | #329/#341/#358/#317; final engine completion/deletion, not migration |
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
| #423 | yes | landed protocol/github boundary; auth tests |
| #424 | yes | landed package/capability foundation + D4/F42/F44 reconciliation |
| #334 | recovery now | final exports + #424 extraction |
| #335 | recovery now | #424/#334/#341 |
| #425 | yes | #423 auth + #424 content boundary |
| #390 | prepare | #425 shell + shipped quota/provider protocol |
| #336 | recovery now | #424 README renderer + #339/#341 docs-impact owners |
| #337 | recovery now | architecture/product materially final |
| #360 | work in parallel where possible | all required final product Requests terminal; optional packaging smoke is not a gate |
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
- a supported dual-engine production-migration/cutover phase;
- mandatory Python-vs-df parity or shadow equivalence before replacement;
- legacy compatibility adapters retained only to support migration;
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
- #359 rebuilt-engine completion/deletion requirements;
- release/fleet/final acceptance;
- the set of Requests required for completion;
- a prerequisite becomes permanently satisfied and keeping it in the active plan would misrepresent the remaining critical path.

Do not append transient workflow/PR/run checkpoints. GitHub already owns live execution state.
