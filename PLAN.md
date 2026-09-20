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

The native `docs.df` → `@darkfactory/docs` content/API graph → `@darkfactory/web` renderer path is landed. `properdocs.yml` and `mkdocs.yml` are absent; they are not compatibility inputs.

Continue in parallel:
- #334 — keep strict TSDoc/API coverage complete as final public exports are added.
- #424 — finish the remaining native docs-compiler contract, especially recovery dispositions and final capability/repository metadata integration; do not reintroduce ProperDocs/MkDocs compatibility.
- #335 — publish the detected first-party API + architecture content through the native content graph after #334 + #341 provide the final extraction/detection contracts.
- #336 — finish deterministic docs-impact enforcement using #341's final detection/diff contract rather than another detector.
- #337 — finish the current-only documentation/governance truth pass and automated contradiction enforcement against the final shipped architecture.
- #425 — finish the broader GitHub-backed operator application on the existing `@darkfactory/web` package.
- #390 — integrate remaining operator/dashboard surfaces into that shared application.

Documentation work has one compiler, one semantic graph and one renderer. Historical/superseded documentation state remains only in GitHub issues.

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

### Stable / landed

- The canonical default branch is `darkfactory`.
- #733 removed the obsolete shadow/parity dispatcher path.
- #747 landed the shared `@darkfactory/web` shell on the native docs/web architecture.
- #741 landed the deterministic git/workspace primitive slice for #384 as `9788f0ad83d83be8da9d647366c4db82edff082f`.
- Repository docs remain aligned with the final-only architecture: no compatibility release, migration path, shadow engine, pre-release/canary phase, historical README or separate harness documentation is part of the target system.

### In-flight governed lanes

#### #341 / Planning #780 / PR #787

PR #787 is draft and **not merge-ready**.

Current blocking findings:

- it recreates a central `DEFAULT_ECOSYSTEM_ACTIONS` table, which violates #780's approved rule that core normalizes evidence while capabilities contribute actions;
- the durable repository-evidence mechanism is being introduced under deletion-bound `harness/` rather than the final core/config owner;
- the normalized result is not yet wired into doctor/diagnostics, CI/check generation + required-check synchronization, touched-package verification/protection, and docs/TSDoc/API extraction;
- `@darkfactory/harness` imports `@darkfactory/capability` without declaring the workspace dependency;
- unrelated `packages/web` changes introduce a Wouter type not exported by the installed version.

A blocking review is recorded on PR #787. Rebase/update it from current `darkfactory`, remove the duplicate action table/unrelated web scope, move durable ownership to the final package boundary, integrate every required consumer, then run the full current format/type/test/docs checks.

#341 remains the highest-value unblocker because #329/#358/#339 consume its final detected-action interface.

#### #423 / Planning #783 / PR #791

PR #791 is draft and **not merge-ready**.

Current blocking findings:

- access/refresh tokens are persisted in browser `localStorage`;
- callback state/verifier validation and one-time consumption are missing;
- the confidential broker implements exchange only, not refresh/revocation;
- restoration does not enforce expiry/refresh policy;
- permission projection ignores GitHub App installation/repository authority;
- mutation payload typing uses `any`;
- negative security/import-isolation tests are missing.

A blocking review is recorded on PR #791. Fix these against the existing `@darkfactory/auth` boundary; do not introduce keychain/browser coupling or a second RBAC/state backend.

#### #422 / Planning #781

The current-tree keychain rebuild branch is active and currently carries one unique importer slice while behind the latest default branch.

Continue the clean current-tree rebuild only for missing #422 behavior: provider/account import, borrowed credential refresh, metadata, redaction/secret scanning, diagnostics and browser isolation. Reconcile F14 behavior without copying stale branch structure.

#### #329 / Planning #786

The latest governed implementation attempt produced no file changes. The old F38-derived feature branch remains stale/diverged and is evidence only.

Restart from current `darkfactory`. Proceed now with the #341-independent parts (schema/extraction behavior, natural-stop semantics, explicit offline capture-schema mode, removal of forced normal-task capture paths). Final code/workspace verification integration waits only for the shipped #341 interface.

#### #384

The deterministic git/workspace primitive slice is landed. Keep #384 open only for the remaining #358 persisted conflict/run-state integration and #339 hook integration; do not rebuild already-landed primitives.

### Recovery branch cleanup

There are still 16 `recovery/*` branches. Recovery branches are temporary inputs, not archives.

- Keep only branches with unresolved unique work for an active Request.
- Record the exact retained/rejected/subsumed disposition on the owning Request as soon as it is known.
- Delete each recovery branch immediately after its unique work is terminal; do not wait for #361.
- F14, F38, F47 and F49 remain active evidence inputs for #422, #329, #339 and #341 respectively until their dispositions are recorded.
- Audit the remaining recovery branches against already-landed Requests and remove terminal branches rather than carrying historical state forward.

### CI / pipeline interpretation

Pipeline failure issues #794 and #795 were opened from PR #787 merge-ref jobs; those jobs checked out `refs/remotes/pull/787/merge`. They are evidence that #787 is currently failing, not evidence that the settled `darkfactory` checkpoint itself regressed.

Do not paper over those failures with compatibility behavior. Fix #787 at its final owners and rerun the governed checks.

## 11. Current execution priority

Run independent stable work concurrently; serialize only on real interfaces.

1. **Finish #341 / PR #787 correctly.** This is the immediate core unblocker. Remove the duplicate ecosystem-action table, land repository evidence in the final owner, connect all required consumers, and get format/type/test/docs checks green.
2. **Fix #423 / PR #791 in parallel.** Complete the actual browser-auth/confidential-broker security contract and merge only when the negative tests and authority boundary are proven.
3. **Continue #422 / #781 in parallel.** Rebase the clean keychain rebuild onto current `darkfactory`, integrate the remaining F14-derived behavior, record disposition, and delete terminal recovery input.
4. **Restart #329 / #786 from current tree.** Implement every #341-independent result-capture piece now; connect final verification as soon as #341 lands.
5. **Advance #358 now on discovery, handler inventory and stable graph scaffolding.** Resolve the F30-4 recovery disposition. Final production-handler integration consumes #329 + #341 rather than inventing substitute interfaces.
6. **Advance #317 in parallel** on deterministic mutation-claim validation and branch-update/conflict behavior using the landed #384 primitives; only graph re-entry waits for #358.
7. **Advance #339 in parallel.** Recover/import the exact F47 hook behavior now; use #341 for ecosystem quality/docs actions instead of hard-coded detection.
8. **Continue #360 release engineering for every stable surface** (manifests, versioning, artifact layout, installers/updaters, native builds, web bundle, provenance/checksums, clean-directory verification). Publish only the final supported release once.
9. **Keep #403/#251/#332/#334/#424/#335/#336/#337/#425/#390 moving when their current interfaces are stable.** Do not let second-order operator/docs/web work block the #341 → #329/#358 → #317 → #359 production-engine spine.
10. **Complete #359 immediately when the core lifecycle is real**, then publish #360, run #361 across all six consumers, and close #68 only after installed-release acceptance passes.

No task should wait for a migration, compatibility, shadow, canary or historical-preservation step. The governing optimization target remains the shortest safe path to the final TypeScript df system.
