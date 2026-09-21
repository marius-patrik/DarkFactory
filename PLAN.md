# DarkFactory — Canonical Completion Plan

## 1. Purpose

This file contains only the current forward execution plan for finishing DarkFactory.

Product requirements live in `PRD.md`. Feature-specific behavior, recovery provenance, rejected/superseded implementation evidence and historical execution details live in current GitHub Requests. Accepted ADRs define current architecture. GitHub issues are the authoritative work record.

The optimization target is the shortest safe path to the final `#360 → #361 → #68` end state.

## 2. Authority

When implementation details disagree, use this order:

1. `PRD.md`;
2. the current Request body;
3. accepted ADRs in `.agents/notes/adr/`;
4. the latest owner-approved Planning artifact for that Request;
5. this file for cross-Request sequencing;
6. live repository/GitHub state.

Repository documentation describes only current contracts and current forward work. Historical, superseded and provenance material belongs in GitHub issues.

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
- Remaining `harness/` ownership is deletion-bound implementation source, not final architecture.
- #360 publishes the final supported release directly; there is no compatibility, parity, shadow, canary or pre-release phase.

When a final owner covers a responsibility, remove the alternate/deletion-bound owner rather than maintaining both.

## 4. Execution rules

### 4.1 Parallelize by stable interfaces

Run independent Requests concurrently whenever they do not depend on an unsettled interface.

A Request waits only for the concrete contract it actually consumes.

### 4.2 Implement only final owners

New behavior is implemented directly in its final package or capability.

Do not add code, tests, workflows, adapters, documentation or configuration whose only purpose is to keep a non-final production path working.

### 4.3 Preserve deterministic truth

Models perform judgement and file edits. The engine owns deterministic effects and completion evidence.

No code path may treat model prose as proof of commit, push, merge, branch update, verification or delivery. External effects fail closed unless success is observed.

### 4.4 Current documentation only

README, PRD, PLAN, ADRs, rules, package docs, workflow comments and generated docs describe current contracts and current forward work only.

Historical/superseded implementation narratives and recovery provenance remain in GitHub issues.

### 4.5 Recovery branch lifecycle

Recovery branches are temporary implementation inputs, not archives.

- Keep a recovery branch only while it contains unresolved unique work for an active Request.
- Record its final integrated/superseded/rejected disposition in the owning issue.
- Delete it immediately after no unique required state remains.
- #361 must finish with no terminal recovery branches remaining.

### 4.6 Pipeline-first execution

Use the governed DarkFactory Request pipeline for every work item the currently shipped pipeline can execute correctly.

- Bind work to the existing Request and use Planning, implementation, deterministic verification, review/fix, alignment, checks and merge where those stages are functional.
- Run independent Requests concurrently on isolated branches.
- Manual/local work is limited to bootstrap gaps the current pipeline cannot safely execute, such as exact local-byte recovery or repair of the pipeline itself.
- Hand bootstrap work back to the governed pipeline at the earliest reliable stage.
- Never build a compatibility/migration path merely so obsolete orchestration can process new work.

## 5. Core production-engine path

The current hard integration spine is:

```text
#341 detected evidence/actions — COMPLETE
        ├─> #329 natural-stop/result truth ──> #358 graph-native orchestration ─┐
        ├─> #358 detected verification/actions ────────────────────────────────┤
        └─> #317 structured mutation evidence + branch repair ────────────────┤
                                                                                └─> #359 production engine complete
```

#329, #358 and #317 are active concurrently. #358 consumes the completed #341 contract and joins #329 only at the final typed result boundary. #317 continues deterministic mutation/repair work now and joins #358 only for real graph re-entry/resume.

### #329 — result capture

Finish natural-stop completion and structured judgement extraction in final `protocol`/`core`/`cli` owners.

Acceptance:
- code-node truth derives only from observed workspace/diff/scope/verification/commit state;
- judgement extraction uses the ordinary routed provider/failover/account/quota path with provider-enforced structured output;
- package boundaries use `@darkfactory/*` exports rather than sibling source imports;
- compatibility-only `harness` result-capture bridges are removed;
- offline capture-schema inspection remains supported.

### #358 — graph-native orchestration

Finish real production graph handlers, durable execution/resume and Request lifecycle orchestration in final owners.

Acceptance:
- external effects fail closed;
- Planning/review/alignment artifacts come from real routed judgement contracts;
- repository/base state is observed dynamically;
- agent, automation, check-reference, gate/comment/hint and resume behavior use real owners rather than scripted success;
- persisted effect identity proves idempotent/exactly-once resume semantics;
- the final #329 result contract is consumed directly.

### #317 — truthful branch updates and mutation evidence

Finish deterministic branch-update/conflict handling and typed mutation-claim validation.

Acceptance:
- model/respond boundaries emit or extract typed claims rather than regex/phrase scanning;
- claimed branch/SHA/PR/file targets match observed effect evidence exactly;
- default/base resolution is dynamic and fail-closed;
- commit/push failure is never converted into repaired success;
- detected verification runs on repaired state;
- successful repair re-enters the real #358 graph rather than setting a boolean placeholder.

### #359 — production engine completion

#359 closes only when:
- #329, #358 and #317 are merged and green;
- df is the sole normal mutating production dispatcher for the core Request lifecycle;
- Planning uses the shipped unified reviewed Planning contract;
- graph handlers are real and resumable;
- Request/PR/review/merge effects use final TypeScript owners;
- a real df-only Request lifecycle completes end to end;
- interruption/resume does not duplicate completed effects;
- mutation/completion evidence is truthful and auditable;
- legacy Python production orchestration and deletion-bound `harness` responsibilities are removed or unreachable wherever final owners have landed.

Do not hold #359 for unrelated final-product features that are not required by the core lifecycle.

## 6. Parallel final-version work

### Credentials and authentication

- #422 — finish `@darkfactory/keychain` as the sole machine/harness credential owner and reconcile the remaining F14 recovery input.
- #248 — finish df-managed provider OAuth/login and multi-account behavior against `@darkfactory/keychain`.
- #423 — COMPLETE; consume the shipped `@darkfactory/auth` browser/session boundary.
- #252 — proceed after its actual provider/login dependencies are satisfied; task-profile inference is already complete.

### Quality, git and governance

- #339 — finish deterministic hook invocation, rule binding/diagnostics and shared local/CI enforcement in final owners; reconcile the remaining F47 recovery input.
- #384 — finish only the remaining integration around the already-landed deterministic git/workspace primitives.
- #385 — implement typed/durable Epic/Request delivery relationships against the real persisted Request/run state.
- #386 — implement stacked PR topology, restack and dependency-aware merge order after #384 + #358 + #385 stabilize.
- #388 — finish recovery/local-work intake, provenance, secret blocking, Request binding, Planning invalidation, cleanup eligibility and deep resume integration.
- #332 — implement graph-native fine-grained parallel chunk/worktree execution once #358 persisted execution interfaces are stable.

### Operator surfaces

- #403 — finish the supported df operator CLI against final command/runtime owners.
- #251 — finish the interactive TUI using the same canonical command/metadata/runtime surfaces.
- #425 — finish the shared GitHub-backed operator application in `@darkfactory/web`.
- #390 — finish live browser-safe operator/quota data transport and published-site acceptance without browser keychain access or a second state backend.

### Documentation

- #334 — COMPLETE.
- #335 — COMPLETE.
- #424 — COMPLETE.
- #336 — finish shared PR-base/local/CI docs-impact enforcement through the final #339 hook surface, then the late PRD truth pass.
- #337 — keep current-truth enforcement active and perform the final repository-wide contradiction audit after the product surface stabilizes.

Documentation has one compiler, one semantic graph and one renderer. There is no historical documentation surface.

## 7. Release work

### #360 — prepare continuously, publish once

Release engineering proceeds in parallel wherever contracts are stable.

Current release foundations already include deterministic artifact integrity/provenance generation and verification, lockstep first-party version validation, a final-publication guard, and one canonical development-version source.

Remaining work:
- final package/publish metadata;
- final lockstep product SemVer application plus independently versioned capability ABI;
- source-free npm/native artifact layout;
- packaged runtime/data/capability assets;
- installers/updaters;
- native/platform smoke matrix;
- clean-directory packed-command verification;
- prebuilt `@darkfactory/web` bundle;
- final checksums/source provenance over the exact release payload.

Do not publish while accepted release-affecting product work is still changing. Publish the single final supported release only at Join B.

## 8. Fleet acceptance

### #361 — prove the final system

Validate the final #360 release across:

1. DarkFactory;
2. omnis;
3. ChessWithQuests;
4. OdbornaPrace-paper;
5. template-OdbornaPrace;
6. OdbornaPrace-mono.

Fleet acceptance proves:
- source-free install/update;
- package/domain/capability detection;
- Request → Planning → implementation → verification → review/fix → merge/reconciliation;
- interruption/resume without duplicate effects;
- git/governance/hook behavior;
- keychain/auth boundaries;
- docs content/API generation and shared web rendering;
- release/update behavior;
- consistent `audit.df`;
- no unexplained open implementation work or terminal recovery branches.

#361 validates the finished product; it is not a place to finish known implementation.

## 9. Final #68 acceptance

After #361 is green, re-run the original declarable-graph product contract against the installed final release.

#68 closes only when the final system satisfies the current PRD and all required child Requests are terminal.

## 10. Current execution checkpoint — 2026-09-21

### 10.1 Canonical state

- Canonical/default branch: `darkfactory`.
- #341 detected evidence/actions: complete.
- Unified reviewed Planning lifecycle: complete.
- `@darkfactory/auth` browser/session boundary: complete.
- Native `docs.df` → `@darkfactory/docs` → `@darkfactory/web` documentation path: complete.
- Strict first-party TSDoc/API documentation coverage: complete.
- Current-only README/retired-doc drift enforcement: active.
- Stable CLI command registry/metadata: landed.
- Capability-owned F47 hook rule behavior for tests-touched, conventional commits and branch names: landed.
- Browser-safe redacted quota protocol and the static/disconnected-safe quota web view: landed.
- Release integrity/provenance, verification and development-version/lockstep guards: landed.
- Final-only architecture remains authoritative: no compatibility release, dual-engine parity, shadow path, canary/pre-release phase, historical README or separate public harness architecture.

### 10.2 Active core implementation vehicles

All three active core PR heads currently have green aggregate CI but remain draft/nonterminal because their semantic reviews are not satisfied:

- #329 → PR #891 on `feat/natural-stop-result-truth`.
- #358 → PR #894 on `feat/graph-native-production-orchestration`.
- #317 → PR #899 on `fix/conflict-repair-mutation-evidence`.

These branches are behind current `darkfactory`; repair/rebase them against current canonical state as part of finishing their documented blockers rather than creating replacement implementations unless a branch is proven unrecoverable.

### 10.3 Active recovery inputs and branch hygiene

Exactly two `recovery/*` refs remain intentionally active:

- `recovery/f14-borrowed-refresh` → #422;
- `recovery/f47-hooks` → #339.

Delete each immediately after its owning Request records terminal disposition and no unique required state remains.

One rejected/superseded feature ref is still live and must not be reused:

- `feature/wire-graph-executor-handlers-and-graph-native-orch` → rejected #358 implementation state.

Delete that ref as cleanup; the current #358 vehicle is PR #894. `gh-pages` is a deployment branch and is not recovery/topic cleanup.

After active PRs merge, remove their topic branches when safe.

### 10.4 Current repository cleanup pressure

The repository is intentionally mid-cutover, so `harness/`, root workspace scripts delegating to `harness`, and legacy Python orchestration files may still exist. They are not final architecture.

Do not perform cosmetic mass deletion before final owners exist. Remove each deletion-bound owner immediately when its final responsibility lands, and complete the remaining ownership/deletion pass in #359.

### 10.5 Pipeline hygiene

A generated PR or agent summary is not delivery evidence.

- Start each implementation from current canonical HEAD unless the active branch is explicitly verified and repaired forward.
- Do not reuse superseded/diverged implementation branches.
- Reject lockfile-only/no-op diffs that claim broader completion.
- Reject scripted/stub success and swallowed external-effect failures.
- Verify actual diff, final ownership, base/head relation, checks, implementation review and alignment before closing a Request.
- Scratch/debug files are never delivery artifacts.
- A red canonical branch is stop-the-line until restored; red isolated topic branches do not block unrelated green work.

## 11. Optimized execution schedule

The schedule is defined by dependency joins, not a serial Request queue.

### 11.1 Scheduling invariants

- Keep every independent stable lane moving.
- Serialize only at a real interface dependency.
- Prioritize work that removes downstream join dependencies.
- Build only final package/capability owners.
- Keep branches/PRs narrow; rebase dependent work promptly after interface-defining changes land.
- Reconcile recovery work inside its owning Request.
- Clean terminal branches immediately without delaying functional integration.
- Run release engineering continuously; publish exactly once.
- Do not defer known implementation into #361.

### 11.2 Join A — finish the production engine

Run now in parallel:

**A1 — #329**
- Finish package-boundary/final-owner cleanup on PR #891.
- Preserve routed provider-enforced structured extraction, natural-stop truth and offline capture-schema behavior.
- Rebase onto current canonical state and merge only after semantic review/alignment is clean.

**A2 — #358**
- Repair PR #894 to final owners with fail-closed effects, real routed lifecycle outputs, dynamic repository state, complete handler coverage and durable idempotent resume.
- Join #329 only through its final typed boundary.
- Rebase onto current canonical state and merge only after semantic review/alignment is clean.

**A3 — #317**
- Repair PR #899 to typed claim/effect evidence, exact target matching, fail-closed branch/commit/push behavior and deterministic verification.
- Join #358 only for real graph re-entry/resume.
- Rebase onto current canonical state and merge only after semantic review/alignment is clean.

**Join A condition:** #329, #358 and #317 are merged/green on current `darkfactory`. Then execute #359 immediately and remove/unreach the remaining legacy production owners for the core lifecycle.

### 11.3 Workstream B — governance, git, recovery and parallel execution

Run now:
- #339 remaining hook invocation/rule-binding/diagnostics/CI integration.
- #384 remaining graph/hook integration around existing deterministic git primitives.
- #388 stable recovery intake/provenance/secret/request-binding pieces that do not depend on unsettled run-state interfaces.

When #358 persisted Request/run-state interfaces stabilize:
- #385 Epic/Request relationship model.
- #332 parallel chunk/worktree execution.
- #388 deep resume/reconciliation integration.

When #384 + #358 + #385 stabilize:
- #386 stacked PR orchestration.

### 11.4 Workstream C — credentials and media providers

Run independently:
- #422 final keychain/F14 reconciliation in current `packages/keychain`.
- #248 provider login/multi-account work as soon as required keychain interfaces are stable.
- #252 image/video generation once its remaining provider/login dependencies are available.

Do not create credential ownership outside `@darkfactory/keychain`.

### 11.5 Workstream D — CLI, TUI, docs and web

Run stable pieces in parallel:
- #403 remaining operator commands.
- #251 TUI against the same command/runtime metadata.
- #425 shared operator web application.
- #390 live browser-safe GitHub/auth transport and final quota/dashboard deployment acceptance.
- #336 remaining docs-impact enforcement through #339.
- #337 final contradiction audit only after release-affecting product surfaces stop changing.

Do not create a second docs renderer, second quota engine, browser keychain path or backend state database.

### 11.6 Workstream E — release engineering

Continue #360 in narrow final-owner slices while A–D progress:
- final package/publish metadata and artifact layout;
- runtime/capability/web assets;
- source-free installation/update;
- native/platform smokes;
- clean-directory packed verification;
- exact release payload integrity/provenance.

Keep this work current with stable interfaces so final publication is a short join operation rather than a separate migration project.

### 11.7 Join B — final release freeze and publication

After #359, keep remaining final-product lanes parallel until every release-affecting #68 Request is terminal and all accepted behavior is in final owners.

At Join B:
1. finish the #337 current-truth/documentation audit;
2. remove remaining alternate/deletion-bound owners whose final responsibilities have landed;
3. disposition and delete every terminal recovery/topic branch;
4. run final package/API/docs/security/governance checks;
5. freeze the exact supported product surface and final version;
6. publish the single final #360 release.

There is no migration, parity, canary, shadow or pre-release gate.

### 11.8 Join C — installed fleet acceptance

Consume the published artifact immediately in #361 across all six consumers.

If acceptance exposes a defect, fix it in the owning final package/Request, publish the corrected final release and rerun the affected acceptance evidence. Do not add compatibility layers.

When #361 is green, perform the final #68 contract check and close #68.

### 11.9 Immediate allocation

Highest-downstream-value work now:

- repair/rebase #891, #894 and #899 in parallel against their semantic blockers;
- continue #339 and #422 independently, keeping only the two active recovery refs until terminal disposition;
- continue #360 release construction and #425/#390/#403 stable surface work in parallel;
- start #385/#332 as soon as #358 persisted state is stable;
- start #386 as soon as #384 + #358 + #385 are stable;
- finish #388 against shipped git/run-state primitives rather than a side recovery engine;
- delete the rejected stale #358 feature ref now;
- converge only at Join B, publish once, validate through #361, then close #68.
