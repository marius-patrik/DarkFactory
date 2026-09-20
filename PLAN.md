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

## 5. Core production-engine path

The hard dependency spine to #359 is:

```text
#329 natural-stop result capture ─┐
                                  ├─> #358 graph-native production orchestration
#341 detected quality/actions ────┘              ↓
                                             #317 truthful branch update/effects
                                                ↓
                                             #359 production engine complete
```

### #329 — result capture

Finish natural-stop result capture so code-node completion derives from workspace/effect state and judgement results use the shared structured extraction path.

### #341 — detected quality/actions

Make detected packages/ecosystems plus capability resolution the single source for test, lint, format and API-documentation actions.

### #358 — graph-native orchestration

Wire real production handlers, durable graph execution/resume and Request lifecycle orchestration through the shipped #329/#341 contracts.

### #317 — truthful branch updates

Finish deterministic branch-update/conflict handling and ensure text-only results cannot claim code mutations.

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

PR #577 is the active documentation convergence gate. It must land the native `docs.df` → `@darkfactory/docs` content/API graph → `@darkfactory/web` renderer path, deterministic README projection and current-only documentation with no alternate documentation runtime.

After that gate:
- #334 — keep strict TSDoc/API coverage complete as final public exports are added.
- #336 — enforce deterministic docs-impact updates for PRD and other normative surfaces.
- #425 — finish the broader GitHub-backed operator application on the same `@darkfactory/web` package.
- #390 — integrate remaining operator/dashboard surfaces into that shared application.

Documentation work has one compiler, one semantic graph and one renderer.

## 7. Final release

### #360 — publish and install df

Publish the actual supported DarkFactory release directly.

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

## 10. Current execution priority

Highest-value concurrent work:

1. #329 and #341 in parallel;
2. #358 as soon as their required interfaces are available;
3. #317 then #359 on the core-engine spine;
4. land PR #577; continue #334/#336/#425/#390 alongside #422/#248/#423, #339/#384/#385/#386/#388 and #403/#251/#332/#252 according to their actual dependencies;
5. #360 final release;
6. #361 fleet acceptance;
7. #68 final product acceptance.

No work should wait merely to preserve an implementation sequence when its final interfaces are already stable.
