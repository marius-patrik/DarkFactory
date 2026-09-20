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
- As #329/#358/#317/#359 land, progressively reduce the bootstrap exception until normal DarkFactory development is entirely self-hosted.

## 5. Core production-engine path

The hard integration spine to #359 is now:

```text
#341 detected quality/actions — LANDED
        ├─> #329 natural-stop/result truth ──> #358 graph-native orchestration ─┐
        ├─> #358 detected verification/actions ────────────────────────────────┤
        └─> #317 structured mutation evidence + branch repair ────────────────┤
                                                                                └─> #359 production engine complete
```

#341 is no longer a scheduling gate. Run #329, #358 and #317 concurrently from current `darkfactory`. #358 should consume the shipped #341 interface immediately and wait only for #329 result semantics where actually required. #317 should implement its deterministic update/conflict and structured-evidence work now; only result-contract integration waits on #329 and graph re-entry waits on the relevant #358 surface.

### #329 — result capture

Finish natural-stop result capture so code-node completion derives from workspace/effect state and judgement results use the shared structured extraction path.

### #341 — detected quality/actions — complete

Merged on `darkfactory`. Detected repository/package/domain evidence plus capability-resolved actions are the single source for quality, touched-package verification, required-check/protection status and native API/docs extraction.

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
- #423 is complete; consume the shipped `@darkfactory/auth` browser/session boundary.

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
- #334 — complete. Strict detected TypeScript/TSDoc API coverage is enforced by the native docs path and CI.
- #335 — complete. Detected first-party API + architecture content is published through the canonical content graph and rendered by `@darkfactory/web`.
- #424 — complete. Commit `1340019ee75cd9100f79cc032b484a65c62a762f` added detected repository/package/capability/graph metadata and capability-contributed pages to the canonical content graph; D4/F42/F44 dispositions are terminal.
- #336 — the pure deterministic docs-impact classifier/`Docs: none` policy may land independently in `@darkfactory/docs`; PR-base diff and shared local/CI enforcement join the final #339 hook owner rather than creating another hook engine.
- #337 — current-only README/retired-surface drift enforcement is landed; keep it active and finish the final repository-wide contradiction pass after the product surface stabilizes.
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

- The canonical/default branch is `darkfactory`.
- The latest implementation integration point is PR #887 (`a3b085627b2088cd203fea3346e39dac5fea969c`); always resolve the live `darkfactory` HEAD at execution time rather than hard-coding a self-referential PLAN SHA.
- #858 repaired the packaged df runtime boundary by resolving workflow contracts through `@darkfactory/protocol/workflow` instead of a source-tree-relative import.
- #341 is landed with the final repository evidence + capability-resolved deterministic action contract.
- #880 landed deterministic current-documentation truth checks: README projection drift and retired docs surfaces now fail native docs CI.
- #885 landed explicit nonterminal `Advances #N` Request binding, separating partial-delivery binding from terminal GitHub closing intent.
- #887 landed the stable `@darkfactory/cli` command-registry slice with deterministic metadata shared by CLI/TUI/web consumers.
- #741's deterministic git/workspace primitive slice, #423 browser-auth boundary, the native docs/web foundation and the unified Planning lifecycle remain landed.
- The final-only architecture remains authoritative: no compatibility release, dual-engine parity phase, shadow production path, canary/pre-release phase, historical README, or separate public harness architecture.

### Core production-engine lanes

#### #329 / F38

#329 remains open. `recovery/f38-result-capture` is one of the three remaining remote recovery inputs.

Prior PRs #811 and #860 are closed evidence only. #860 reused a stale branch and carried scratch/debug files, so it is not an implementation vehicle.

The next #329 implementation must start from the exact current `darkfactory` HEAD on a fresh branch, use natural model stop, derive code-node truth from observed workspace/diff/verification/commit/effect evidence, use the normal routed supervisor path for judgement extraction, expose explicit offline `df run --capture-schema`, and record F38 disposition before cleanup.

#### #358

#358 remains open with no valid implementation PR.

PR #859 is closed evidence only: its handlers returned scripted success instead of invoking the real supervisor/workspace/run-state machinery.

The next implementation starts fresh from current `darkfactory` and wires real production handlers, durable run persistence/resume, check/gate behavior, idempotent external-event resume and the unified lifecycle in existing final owners. It consumes #329 only at the real typed result boundary and does not invent substitute result or verification contracts.

#### #317

#317 remains open with no valid implementation PR.

PRs #809 and #870 are closed evidence only. #870 reused the stale superseded branch and did not represent a current-tree implementation.

The next implementation starts fresh from current `darkfactory`, uses the landed deterministic git/workspace primitives, resolves the actual base branch dynamically, validates structured mutation claims against observed effects, performs deterministic update/conflict repair and verification, and joins graph re-entry only when the relevant #358 surface exists.

#### #359

#359 remains open. It was previously auto-closed after the #858 bootstrap repair and was explicitly reopened because its own prerequisites and acceptance evidence were still incomplete.

Do not close #359 until #329, #358 and #317 are merged/green and the repository contains real evidence for the df-only core lifecycle, interruption/resume without duplicate effects, truthful mutation/completion evidence and retirement/unreachability of legacy Python production orchestration.

PR #864 is closed: its only repository diff was `bun.lock`, so its broad completion claims are not implementation evidence.

### Parallel final-version lanes

#### #422 / F14

#422 remains open. `recovery/f14-borrowed-refresh` remains an active recovery input.

PRs #792/#813 are superseded evidence; #868 is also closed because it reused a stale divergent branch rather than rebuilding from the current tree.

Continue from current `packages/keychain` ownership only. Reconcile remaining importer/login, borrowed-refresh, metadata, redaction/scanning/diagnostics, safe import/export, facade-removal and browser-boundary work without creating alternate source roots or Python ownership.

#### #339 / F47

#339 remains open. `recovery/f47-hooks` remains an active recovery input.

PRs #808 and #866 are closed evidence only. #866 reused the rejected stale `harness/src/hooks/*` branch ownership.

The final implementation must start fresh from current `darkfactory`: hook invocation mechanisms belong in final core/mutation owners; product/rule definitions and registry contributions belong to the official `hooks` capability; tests are TypeScript/df-owned.

#### #384 / #385 / #388

- #384's deterministic git/workspace primitive slice is landed; remaining work is only the still-missing integration required by final graph/hook surfaces.
- #385 may continue independently on typed/durable Epic/Request relationships using existing protocol/GitHub/capability owners.
- #388 may continue on recovery intake/provenance, secret blocking, Request binding, Planning invalidation and cleanup-eligibility contracts. PR #871 is closed because its only diff was `bun.lock`; claimed pre-existing behavior is not delivery evidence. Join deeper git/resume execution only through #384/#358 rather than a side recovery engine.

#### #360

#360 remains open with no valid implementation PR.

PRs #816 and #862 are closed evidence only; #862 reused the stale release branch and did not satisfy the full release contract.

Continue stable release engineering in parallel for final package metadata, Node-compatible CLI/library boundaries, runtime assets, checksums/provenance, native/platform smoke coverage, packed clean-directory installation and the prebuilt web artifact. Publish exactly once after the final release join.

#### Documentation and operator lanes

- #334 is complete: F42 recovery is terminal and strict TypeDoc/TSDoc extraction is enforced through the detected native docs path.
- #335 is complete: detected API + architecture content is carried in the canonical content graph and rendered/tested through `@darkfactory/web`.
- #424 is complete through `1340019ee75cd9100f79cc032b484a65c62a762f`; detected repository/package/capability metadata and capability-declared docs are part of the native graph with no duplicate detector.
- #337 remains open only for the late final repository-wide contradiction audit; deterministic README/retired-surface enforcement already landed through PR #880.
- #403 remains open, but the stable command-registry/metadata slice landed through PR #887. Finish only the remaining real operator commands and later engine/release joins against final owners.
- #336 joins the final #339 hook enforcement; #425/#390 may consume the already-shipped auth/browser boundaries.

### Recovery and branch cleanup

Remote recovery cleanup has advanced from 16 refs to exactly three:

- `recovery/f14-borrowed-refresh` → #422;
- `recovery/f38-result-capture` → #329;
- `recovery/f47-hooks` → #339.

All other previously retained remote `recovery/*` refs have been deleted after reconciliation. GitHub issues remain the durable provenance record.

The local recovery-cleanup pass is complete for the previously preserved September recovery set: terminal recovery refs were dispositioned in their owning GitHub Requests and removed, leaving only the three active recovery inputs above.

Remote branch hygiene is nearly complete. Exactly two stale `feature/*` refs remain from superseded work: `feature/capability-driven-repository-detection-and-quality` (landed #341 vehicle) and `feature/wire-graph-executor-handlers-and-graph-native-orch` (rejected #358 vehicle). Neither is a valid continuation branch. Delete both; all new #358 work starts from the exact current `darkfactory` HEAD on a fresh branch.

The three remaining recovery branches are deleted immediately after their owning Requests record terminal integrated/superseded/rejected dispositions and no unique required state remains.

### Pipeline hygiene

A pipeline-generated PR is not evidence of implementation by itself.

- Every new implementation attempt starts from the exact current canonical `darkfactory` HEAD on a fresh branch unless the current branch is explicitly proven current and approved for reuse.
- Do not reuse a superseded/diverged feature branch merely because its generated name matches the Request.
- Reject implementation PRs whose diff contains only lockfile/incidental changes while the PR body claims broader feature completion.
- Reject scripted/stub success paths that do not invoke the actual final owner.
- Verify the actual diff, base/head relation, checks, implementation review and final alignment before allowing a Request to close.
- Scratch/debug files are never delivery artifacts.
- Default-branch CI recovered after failure issue #863; #863 is closed. Any future canonical-branch failure remains a stop-the-line signal until the default branch is green again.

## 11. Optimized execution schedule

The plan is scheduled by **join gates and independent workstreams**, not by a single numbered queue. The objective is minimum wall-clock time to the final installed-system acceptance while avoiding speculative work against unstable interfaces.

### 11.1 Scheduling invariants

- Every implementation attempt begins from the current canonical HEAD on a fresh or explicitly verified-current branch; superseded/diverged feature branches are not reusable execution state.
- The mere existence of a remote branch does not make it reusable; a superseded/closed implementation ref remains evidence only until explicitly selected as a current vehicle.
- A PR body or agent summary is never completion evidence without a corresponding meaningful diff in the final owner; lockfile-only/no-op PRs are rejected.
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

**A1 — #341 detected evidence/actions — COMPLETE**
- Merged through PR #828 as `83e227cd229033a2067fc8d245e5540a77853e49`.
- Core owns normalized repository evidence; capabilities contribute applicable actions.
- Doctor, CI/check synchronization, touched-package verification/protection and docs/API extraction consume the shared result.
- F49 disposition is recorded and its terminal recovery branch has been deleted.

**A2 — #329 natural-stop result capture**
- PRs #811 and #860 are retired evidence; create one fresh current-tree implementation from the exact canonical HEAD.
- Reuse only compatible F38 forced-tool/schema mechanics.
- Use the ordinary routed supervisor path for judgement extraction; do not create a second routing/failover abstraction.
- Implement natural-stop runtime completion, offline `df run --capture-schema`, and code-node truth from observed effects + shipped #341 verification.
- Record F38 disposition and delete its recovery branch when terminal.

**A3 — #358 graph-native orchestration**
- Start a fresh current-tree implementation; PR #859 is rejected evidence because it used scripted success instead of real production handlers.
- Wire shipped #341 verification/actions immediately.
- Implement the real production handler inventory, durable run/state owner, graph execution/resume and lifecycle effects now.
- Do not invent a substitute result interface; join only the final #329 result contract when A2 lands.

**A4 — #317 truthful mutation/branch repair**
- Start fresh from current `darkfactory`; PRs #809 and #870 remain rejected evidence.
- Implement structured mutation-claim validation against observed workspace/git/effect evidence using shipped #341 + landed #384.
- Finish deterministic branch update/conflict behavior and tests now.
- Join #329 for final result-contract truth and #358 only for graph re-entry/resume.

**Join A condition:** #341 is already merged. Join A now requires #329 merged, #358 consuming #329 + #341 and merged, and #317 merged/green. Immediately execute #359's final responsibility/deletion pass. Do not wait for auth, docs, web, TUI, stacked PRs, generalized recovery intake or other final-product surfaces unless live implementation proves they are required by the core lifecycle.

### 11.3 Workstream B — governance, git, hooks and recovery productization

This stream runs beside Join A and becomes release-critical later.

**Run now**
- #339: start the final-owner hook implementation now; #341 actions are already shipped. Reconcile F47 without restoring durable `harness/src/hooks/*`.
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

- #422: #792/#813/#868 are closed evidence; reconcile only the still-missing F14/keychain behavior in one fresh current-tree vehicle and finish final `@darkfactory/keychain` ownership.
- #248: finish df-managed provider login/multi-account behavior against `@darkfactory/keychain` as soon as the required keychain interfaces are stable.
- #423 is complete and merged; consume its shipped `@darkfactory/auth` boundary rather than adding another browser/session owner.
- #252: proceed once its actual provider/login dependencies are satisfied; do not block unrelated auth/keychain completion.

These lanes should not touch the engine spine except through already-defined credential/auth interfaces.

### 11.5 Workstream D — docs, web and operator surfaces

Run stable pieces in parallel, with only these waits:

- #334: COMPLETE. Strict TSDoc coverage now runs through the shipped #341 detected API action contract.
- #335: COMPLETE. API + architecture content is published through the canonical docs graph and shared web renderer.
- #424: COMPLETE. Repository/capability/graph metadata integration is landed in the native content graph and recovery dispositions are terminal.
- #336: F44 recovery is reconciled/deleted. Land the pure #341-backed impact classifier independently, then wire PR-base diff and shared local/CI enforcement through #339 once its final hook surface lands.
- #337: README projection/retired-surface enforcement is active; perform the final repository-wide truth pass only after the product surface has stopped changing.
- #403: the command-registry/metadata slice is landed; continue the remaining final operator commands and later engine/release joins. #251 consumes the same registry/metadata source for TUI work.
- #425 and #390: continue the shared `@darkfactory/web` application and integrate the already-shipped #423 authentication contract now.

D4/F42/F44/F45 remote recovery refs are already terminal and deleted. Their dispositions remain in the owning GitHub issues; do not recreate those branches.

### 11.6 Workstream E — release engineering

#360 engineering is continuous. PRs #816 and #862 are closed evidence only; continue from a fresh current-tree vehicle with only valid final packaging semantics.

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

- create fresh current-tree #329, #358 and #317 vehicles simultaneously; #341 is already shipped and must be consumed directly;
- start fresh final-owner #339 now that #341 is available;
- consolidate #422's two stale PRs into one current-tree vehicle while docs/operator work and #360 release engineering continue in parallel; #423 is already landed;
- begin #385/#332 the moment #358's owning state interfaces stabilize;
- begin #386 as soon as #384+#358+#385 are stable;
- finish #388 against those same shipped primitives rather than creating a side recovery engine;
- converge all remaining accepted product work only at Join B;
- publish once, validate through #361, then close #68.

This schedule minimizes idle time, avoids speculative duplicate implementations, and places every unavoidable serialization point at a real interface dependency rather than at an arbitrary Request order.
