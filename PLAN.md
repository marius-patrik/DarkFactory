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

## 11. Optimized execution schedule

The plan is scheduled by **join gates and independent workstreams**, not by a single numbered queue. The objective is minimum wall-clock time to the final installed-system acceptance while avoiding speculative work against unstable interfaces.

### 11.1 Scheduling invariants

- Keep every independent stable lane moving. A blocked lane must not idle unrelated work.
- Serialize only at an explicitly named interface/join below.
- Prioritize work that removes a downstream join dependency over polish that has no downstream fan-out.
- Build against final package/capability owners only. Do not spend time keeping deletion-bound owners operational.
- Keep branches/PRs narrow enough to minimize merge conflicts. When two tasks edit the same unstable owner, land the interface-defining slice first and immediately rebase the dependent slice rather than allowing long-lived divergence.
- Recovery reconciliation is performed inside the owning Request. It is never a separate recovery phase.
- Branch cleanup is immediate after terminal disposition but is not allowed to delay functional integration.
- Release engineering runs continuously for stable contracts, but release publication happens exactly once after the release-freeze join.
- #361 is validation, not a place to finish known implementation.

### 11.2 Join A — production-engine cutover

This is the shortest path to #359 and gets df capable of owning the remaining development as early as possible.

Run these **concurrently now**:

**A1 — #341 detected evidence/actions**
- Correct PR #787 to the final architecture.
- Core owns normalized repository evidence.
- Capabilities contribute applicable actions.
- One resolved result feeds doctor, CI/check synchronization, touched-package verification/protection and docs/API extraction.
- Reconcile F49 semantics and terminate/delete its recovery branch once disposition is recorded.

**A2 — #329 natural-stop result capture**
- Restart from current `darkfactory`, not the stale F38 branch.
- Implement natural-stop/result-schema/extraction/offline-capture work that does not depend on #341 immediately.
- Reconcile only compatible F38 behavior.
- The sole wait is final code-node verification/result integration on the shipped #341 contract.
- Record F38 disposition and delete its recovery branch when terminal.

**A3 — #358 graph-native orchestration preparation**
- Continue recovery discovery, production-handler inventory, durable-run/state inspection and non-conflicting scaffolding immediately.
- Do not invent substitutes for #329 or #341.
- As soon as A1+A2 interfaces land, wire them directly and finish production handlers/resume.

**A4 — #317 truthful mutation/branch repair**
- Continue mutation-claim validation, deterministic branch update/conflict behavior and tests now using landed #384 primitives.
- Only graph re-entry/resume integration waits for the relevant #358 interface.

**Join A condition:** #329 + #341 are merged, #358 consumes them and is merged, and #317 is merged/green. Immediately execute #359's final responsibility/deletion pass. Do not wait for auth, docs, web, TUI, stacked PRs, generalized recovery intake or other final-product surfaces unless live implementation proves they are required by the core lifecycle.

### 11.3 Workstream B — governance, git, hooks and recovery productization

This stream runs beside Join A and becomes release-critical later.

**Run now**
- #339: reconcile F47 and implement hook behavior independent of #341; plug in #341 actions once available.
- #384: keep only remaining persisted-conflict/run-state and hook integration; do not rebuild landed primitives.
- #388: implement/verify minimal provenance/intake surfaces that use already-stable workspace/git contracts; existing recovery refs may continue to be reconciled manually/governedly without waiting for full #388.

**After #358's persisted Request/run-state interface is stable**
- #385: implement the Request/Epic relationship model against the real shipped state owner.
- #332: implement graph-native fine-grained parallel chunk/worktree execution.
- Finish #388 deep resume/reconciliation integration against #358/#384.

**After #384 + #358 + #385 are stable**
- #386: implement stacked PR topology/restack/merge order, reusing #317 conflict repair and #339 hooks.

Do not hold #359 for #385/#386/#388/#332; they are final-release requirements, not production-engine-cutover prerequisites.

### 11.4 Workstream C — credentials and authentication

Run independently of the engine spine:

- #422 / PR #792: finish only missing keychain ownership; reconcile F14; remove duplicate credential custody.
- #248: finish df-managed provider login/multi-account behavior against `@darkfactory/keychain` as soon as the required keychain interfaces are stable.
- #423 / PR #791: finish browser GitHub authentication, broker refresh/revoke, expiry/session restoration, authority intersection and isolation tests.
- #252: proceed once its actual provider/login dependencies are satisfied; do not block unrelated auth/keychain completion.

These lanes should not touch the engine spine except through already-defined credential/auth interfaces.

### 11.5 Workstream D — docs, web and operator surfaces

Run stable pieces in parallel, with only these waits:

- #334: reconcile F42 TSDoc coverage now; final detected API action integration waits only for #341.
- #424: finish native docs compiler metadata/recovery dispositions now; no ProperDocs/MkDocs compatibility work.
- #335: starts final integration immediately when #334 + #341 interfaces are available.
- #336: reconcile F44 behavior now; final shared docs-impact enforcement consumes #339/#341 rather than adding another detector/hook engine.
- #337: keep current-only enforcement active now, but perform the final repository-wide truth pass only after the product surface has stopped changing.
- #403 and #251: finish CLI/TUI surfaces against stable protocol/core APIs; do not wait for #359 where not required.
- #425 and #390: continue the shared `@darkfactory/web` application on stable models; integrate #423 authentication when that contract lands.

D4/F42/F44/F45 recovery branches are reconciled as part of these Requests. Once their unique behavior is represented, record disposition and delete the branches immediately.

### 11.6 Workstream E — release engineering

#360 engineering is continuous:

- package/publish metadata;
- lockstep versioning + capability ABI version;
- source-free npm/native artifact layout;
- installers/updaters;
- native smoke-test matrix;
- packaged runtime/data/capability assets;
- prebuilt web bundle;
- checksums and source provenance;
- clean-directory packaged-command verification.

Do not publish while final product surfaces are still changing. Keep the release implementation rebased on stable interfaces so publication becomes a short final operation rather than a new project.

### 11.7 Join B — final release freeze and publication

After #359, continue all remaining final-product lanes in parallel. The release-freeze join is reached when every #68 Request intended for the final product is **terminal** (merged, explicitly superseded/duplicate, or intentionally rejected with rationale) and all accepted release-affecting behavior is in the final packages/capabilities.

In particular, do not declare #360 complete while accepted remaining work in credentials/auth, hooks/git/governance/recovery, CLI/TUI/execution, docs/web/operator surfaces, or release packaging would change the shipped artifact.

At this join:

1. complete the final #337 current-truth/documentation audit;
2. remove any alternate/deletion-bound owners whose final responsibility has landed;
3. record disposition for every remaining recovery branch and delete every terminal recovery branch;
4. run the final package/API/docs/security/governance checks;
5. freeze the exact product surface;
6. publish the **single final supported #360 release**.

There is no migration, parity, canary, shadow or pre-release gate.

### 11.8 Join C — installed fleet acceptance

Immediately consume the published #360 artifact in #361 across all six consumers.

#361 verifies rather than invents/fixes known architecture:
- source-free install/update;
- doctor/detection/capabilities;
- full governed Request lifecycle + resume;
- Request/Epic/stack/recovery semantics;
- hooks/git/protection/checks;
- credential/auth boundaries;
- docs/API/web/operator surfaces;
- release provenance and `audit.df`;
- zero unexplained open implementation work or terminal recovery branches.

If acceptance reveals a defect, fix it in the owning final package/Request, republish the corrected final release, and rerun the affected fleet evidence. Do not add compatibility layers to make acceptance pass.

When #361 is green, perform the final #68 declarable-graph contract check and close #68.

### 11.9 Immediate allocation from the current checkpoint

The highest-downstream-value work is therefore **not a serial 1→10 queue**:

- keep #341, #329, #358-prep and #317 moving simultaneously toward Join A;
- keep #422/#423, #339, docs recovery/reconciliation, operator surfaces and #360 engineering moving in parallel;
- begin #385/#332 the moment #358's owning state interfaces stabilize;
- begin #386 as soon as #384+#358+#385 are stable;
- finish #388 against those same shipped primitives rather than creating a side recovery engine;
- converge all remaining accepted product work only at Join B;
- publish once, validate through #361, then close #68.

This schedule minimizes idle time, avoids speculative duplicate implementations, and places every unavoidable serialization point at a real interface dependency rather than at an arbitrary Request order.
