# DarkFactory — Canonical Completion Plan

## 1. Purpose

This file contains only the current forward execution plan for finishing DarkFactory.

Product requirements live in `PRD.md`. Feature-specific behavior and implementation evidence live in current GitHub Requests. Accepted ADRs define current architecture. GitHub issues are the authoritative work record.

The optimization target is the shortest safe path to the final #360 → #361 → #68 end state.

## 2. Authority

When implementation details disagree, use this order:

1. `PRD.md`;
2. the current Request body;
3. accepted ADRs in `.agents/notes/adr/`;
4. the latest owner-approved Planning artifact for that Request;
5. this file for cross-Request sequencing;
6. live repository/GitHub state.

Repository documentation must describe only the current system.

## 3. Final architecture constraints

All completion work targets the final architecture directly.

- Root Bun workspace packages are `protocol`, `core`, `capability`, `github`, `keychain`, `auth`, `docs`, `cli`, and `web`.
- Agentic/product behavior belongs in versioned capabilities.
- `repo.df`, `config.df`, and `docs.df` are the configuration contracts.
- `.df` is a filename extension, not a directory.
- The canonical branch is discovered from repository state/configuration.
- Production GitHub effects use `@darkfactory/github`.
- Machine credentials belong only to `@darkfactory/keychain`.
- Human/browser authentication belongs only to `@darkfactory/auth`.
- `@darkfactory/docs` owns the documentation content graph.
- `@darkfactory/web` is the only first-party web renderer.
- `@darkfactory/cli` owns the supported `df` CLI/TUI surface.
- The production orchestration engine is TypeScript df.
- #360 publishes the final release directly; there is no intermediate release phase.

Do not build duplicate compatibility implementations. When a final owner covers a responsibility, remove the alternate owner.

## 4. Execution rules

### 4.1 Parallelize by stable interfaces

Work proceeds concurrently whenever branches do not require an unsettled interface from each other.

A Request waits only when it needs a concrete contract that another Request has not shipped yet.

### 4.2 Implement only final owners

New behavior is implemented directly in its final package or capability.

Do not add code, tests, workflows, adapters, documentation, or configuration whose only purpose is to keep a non-final production path working.

### 4.3 Preserve deterministic truth

Models perform judgement and file edits. The engine owns deterministic effects and completion evidence.

No code path may treat model prose as proof of commit, push, merge, branch update, verification, or delivery.

### 4.4 Current documentation only

Repository documentation, ADRs, rules, README, PRD, PLAN, package docs, workflow comments, and generated docs describe only current contracts.

Repository documentation contains only current contracts.

### 4.5 Recovery branch lifecycle

Recovery branches are temporary implementation inputs, not archives.

- Keep a recovery branch only while it contains unresolved unique work for an active Request.
- Before cleanup, record the branch/ref identity and final disposition in the owning GitHub issue.
- Once all unique work from a recovery branch is integrated, explicitly rejected, or fully subsumed, delete the recovery branch.
- Do not retain terminal recovery branches merely for provenance; GitHub issues are the durable record.
- #361 must finish with no terminal recovery branches remaining.

### 4.6 Pipeline-first execution

Use the governed DarkFactory Request pipeline for every work item that the currently shipped pipeline can execute correctly.

- Open/bind work to the existing Request and let the pipeline perform Planning, implementation, deterministic verification, review/fix, alignment, checks and merge whenever those stages are already functional.
- Run independent Requests concurrently through separate governed branches/runs when their interfaces are stable.
- Do not serialize work merely because one pipeline run is active; repository/Request isolation is the concurrency boundary.
- Manual/local work is allowed only for bootstrap gaps the current pipeline cannot yet execute safely, such as recovering exact local bytes, repairing the pipeline itself, or implementing a missing pipeline capability.
- Bootstrap/manual work must still use normal GitHub Requests/PRs/checks and must be handed back to the governed pipeline at the earliest stage it can reliably resume.
- Never build a compatibility/migration path merely so old orchestration can process new work.
- As #329/#341/#358/#317/#359 land, progressively reduce the bootstrap exception until normal DarkFactory development is entirely self-hosted.

## 5. Core production-engine path

The hard integration spine to #359 is:

```text
#329 natural-stop result capture ─┐
                                  ├─> #358 graph-native production orchestration ─┐
#341 detected quality/actions ────┘                                               │
                                                                                   ├─> #359 production engine complete
#317 truthful mutation/branch-repair work ─────────────────────────────────────────┘
```

#329 and #341 run in parallel. #358 recovery discovery, handler inventory and non-conflicting scaffolding may proceed before they finish, but final integration must consume their shipped interfaces. #317 also proceeds in parallel wherever it can use already-stable git/GitHub/evidence primitives; only its graph re-entry integration waits for the relevant #358 surface.

### #329 — result capture

Finish natural-stop result capture so code-node completion derives from workspace/effect state and judgement results use the shared structured extraction path.

### #341 — detected quality/actions

Make detected packages/ecosystems plus capability resolution the single source for test, lint, format and API-documentation actions.

### #358 — graph-native orchestration

Wire real production handlers, durable graph execution/resume and Request lifecycle orchestration through the shipped #329/#341 contracts.

### #317 — truthful branch updates

Finish deterministic branch-update/conflict handling and ensure text-only results cannot claim code mutations.

Do not serialize all of #317 behind #358. Implement mutation-claim validation, deterministic update primitives and tests as soon as their current owners are stable; connect them to the final graph path when #358 exposes that interface.

### #359 — production engine completion

#359 is complete when:

- df is the sole normal mutating production dispatcher for the core Request lifecycle;
- Planning uses the shipped unified reviewed Planning contract;
- production graph handlers are real and resumable;
- Request/PR/review/merge effects use final TypeScript owners;
- deterministic effects are observable and auditable;
- a real df-only Request lifecycle completes end to end;
- interruption/resume does not duplicate completed effects;
- no required production responsibility exists outside the final TypeScript/package/capability architecture.

## 6. Parallel final-version work

The following work should proceed before #359 whenever its interfaces are stable.

### Credentials and authentication

- #422 — finish `@darkfactory/keychain` as the machine credential owner.
- #248 — complete df-managed OAuth and multi-account login flows.
- #423 — implement `@darkfactory/auth` GitHub App user authentication and browser sessions.

### Quality, git and governance

- #339 — enforce rules through df hooks in local work, pipeline and CI.
- #384 — deterministic common git workspace operations.
- #385 — explicit Epic/Request delivery hierarchy.
- #386 — stacked PR management and dependency-aware merge order.
- #388 — import local work through the normal governed Request pipeline.

### Operator surfaces and execution

- #403 — finish the supported df operator CLI.
- #251 — finish the interactive TUI.
- #332 — fine-grained parallel chunk execution/worktrees.
- #252 — Gemini image/video generation support once its active dependencies are satisfied.

### Documentation and web

The native `docs.df` → `@darkfactory/docs` content/API graph → `@darkfactory/web` renderer path is landed.

Continue in parallel:
- #334 — keep strict TSDoc/API coverage complete as final public exports are added.
- #336 — finish deterministic docs-impact enforcement using #341's final detection/diff contract rather than another detector.
- #425 — finish the broader GitHub-backed operator application on the existing `@darkfactory/web` package.
- #390 — integrate remaining operator/dashboard surfaces into that shared application.

Documentation work has one compiler, one semantic graph and one renderer.

## 7. Release work

### #360 — prepare continuously, publish once

Release engineering is not an end-only phase. Implement every stable piece of #360 in parallel with product completion: package manifests, lockstep versioning, artifact layout, installers/updaters, native builds, web-bundle packaging, checksums/provenance and clean-directory verification.

Do not wait for #359 to begin release work that depends only on already-stable package/ABI/install contracts. Do not publish an intermediate compatibility or pre-release artifact.

When the required final product surface is complete, publish the actual supported DarkFactory release directly.

Acceptance includes:

- lockstep first-party package/capability versioning;
- separately versioned capability ABI;
- source-free installation;
- official capabilities included by default;
- generated adapter/plugin/skill/MCP outputs required by the product contract;
- source/version metadata and checksums;
- prebuilt `@darkfactory/web` bundle;
- install/update tooling using the released artifacts.

## 8. Fleet acceptance

### #361 — prove the final system

Validate the final #360 release across:

1. DarkFactory;
2. omnis;
3. ChessWithQuests;
4. OdbornaPrace-paper;
5. template-OdbornaPrace;
6. OdbornaPrace-mono.

Fleet acceptance must prove:

- source-free install/update;
- package/domain/capability detection;
- Request → Planning → implementation → verification → review/fix → merge/reconciliation;
- interruption/resume;
- git/governance/hook behavior;
- keychain/auth boundaries;
- docs content/API generation and shared web rendering;
- release/update behavior;
- consistent `audit.df`.

## 9. Final #68 acceptance

After #361 is green, re-run the original declarable-graph product contract against the installed final release.

#68 closes only when the final system satisfies the current PRD and all required Requests are terminal.

## 10. Current execution checkpoint — 2026-09-20

### Landed

- #733 removed the obsolete shadow/parity `df-dispatch` workflow and its dedicated tests; #358/#359 own the eventual graph-native production dispatcher.
- #747 landed the shared `@darkfactory/web` operator shell slice on top of the native docs/web architecture. #425 remains open for the broader operator surface.

### Active governed lanes

- #780 → #341: corrected current-tree implementation of **core repository/package/domain evidence with capability-resolved actions**. The rejected #736 detector/quality-capability architecture is closed and must not return.
- #781 → #422: clean current-tree rebuild of remaining `@darkfactory/keychain` ownership. PRs #518/#740 are closed as stale evidence; do not preserve their branch structure.
- #783 → #423: complete browser authentication plus the minimal confidential broker/session/permission boundary from the current tree. PR #760 is partial evidence only.
- #786 → #329: integrate F38-compatible schema/extraction behavior into the real graph/workspace/router result path. PR #769 is partial evidence only.
- #741 → #384 deterministic git/workspace primitive slice is landed. #384 stays open only for #358 persisted conflict/run-state integration and #339 hook integration.

### Dependency holds / next unlocks

- #358: continue recovery discovery/handler inventory now; final graph-native integration consumes #329 + #341 and the terminal F30-4 recovery disposition.
- #317: mutation-claim validation and deterministic branch-update work may consume #384 primitives as soon as they land; graph re-entry waits on the relevant #358 interface.
- #339: recover/import the exact F47 hook lane, then finish ecosystem-specific quality/docs hooks using #341 rather than hard-coded detection.
- #385: held on the actual #358 Request/reconciliation owner.
- #386: held on #384 + #358 + #385 and integrates #317/#339 rather than duplicating them.
- #360: continue release engineering for every stable package/ABI/install/web surface in parallel; publish only once the final product contract is complete.

Rejected/stale delivery PRs are issue/PR evidence only and are not compatibility branches to preserve.

## 10. Current execution priority

Highest-value concurrent work:

1. Dispatch #329 and #341 concurrently through the governed pipeline wherever its current stages are reliable, while locating/reconciling the F30-4 recovery delta for #358.
2. Advance #358 immediately on discovery, handler inventory and stable scaffolding; integrate #329/#341 as soon as they land.
3. Advance #317 in parallel on mutation-evidence validation and deterministic branch-update primitives; only graph re-entry waits for the relevant #358 interface.
4. In parallel, dispatch #422/#248/#423, #339/#384/#385/#386/#388, #403/#251/#332/#252 and #334/#336/#425/#390 through separate governed pipeline runs wherever supported, according to their real interface dependencies.
5. Run #360 release engineering continuously for every stable surface. Final publication happens once; there is no compatibility release, canary, migration release or staged cutover.
6. Delete obsolete Python/alternate owners incrementally as soon as their final TypeScript/package/capability owner covers the responsibility; #359 verifies completion rather than deferring all deletion until the end.
7. Complete #359 as soon as #329/#341/#358/#317 satisfy the core lifecycle.
8. Publish the final #360 release, run #361 fleet acceptance, then close #68.

No work should wait merely to preserve an implementation sequence when its final interfaces are already stable. Prefer self-hosted governed pipeline execution over manual implementation whenever the current pipeline can perform the work correctly. Recovery branches are deleted immediately after terminal disposition is recorded.
