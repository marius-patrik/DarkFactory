# DarkFactory — Canonical Completion Plan

## 1. Purpose and authority

This file contains only the current forward execution plan for finishing DarkFactory.

- `PRD.md` defines product requirements and architecture.
- Current GitHub Requests define approved feature-specific behavior.
- Accepted ADRs under `.agents/notes/adr/` define durable architectural decisions.
- GitHub issues, pull requests, checks and branches are the authoritative live work state.
- This file defines cross-Request sequencing and dependency joins only.

The optimization target is the shortest safe path to the final `#360 → #361 → #68` end state.

Historical implementation narratives, rejected approaches and recovery provenance belong in GitHub issues, not repository documentation.

## 2. Non-negotiable execution constraints

All remaining work targets the final architecture directly.

- Final first-party packages are `protocol`, `core`, `capability`, `github`, `keychain`, `auth`, `docs`, `cli` and `web`.
- Agentic/product behavior belongs in versioned capabilities.
- `repo.df`, `config.df` and `docs.df` are the current configuration contracts.
- `.df` is a filename extension, never a directory.
- Production GitHub effects use `@darkfactory/github`.
- Machine/harness credentials and machine authentication use `@darkfactory/keychain`.
- Human/browser authentication uses `@darkfactory/auth`.
- `@darkfactory/docs` owns the documentation content graph.
- `@darkfactory/web` is the sole first-party web renderer/application package.
- `@darkfactory/cli` owns the supported `df` CLI/TUI surface.
- Remaining `harness/` implementation is deletion-bound source, not final architecture.
- Final packages must remain acyclic; browser-safe code cannot import machine-secret/private-key owners.
- When a final owner covers a responsibility, remove the alternate/deletion-bound owner instead of maintaining both.
- There is no compatibility, parity, shadow, canary or staged production-migration phase.

Models may judge and edit files. Deterministic repository/GitHub effects and completion truth are owned by the engine. A model statement is never proof of commit, push, merge, verification, delivery or resume.

Use the governed DarkFactory pipeline wherever the currently shipped pipeline can execute the work correctly. Manual/bootstrap work is limited to gaps the current pipeline cannot yet safely perform and must return to normal governed execution at the earliest reliable point.

## 3. Current checkpoint — 2026-09-21

### Completed foundations

The following foundations are already landed and should be consumed rather than rebuilt:

- #341 capability-driven detection, verification/action evidence and repository classification;
- #391 unified reviewed Planning lifecycle;
- #423 `@darkfactory/auth` browser/session boundary;
- #334, #335 and #424 documentation architecture work;
- stable CLI command registry/metadata;
- capability-owned initial #339 hook behavior from PR #917;
- browser-safe redacted quota protocol/static quota view;
- release integrity/provenance and lockstep/development-version guards.

### Core production-engine vehicles

#### #329 — COMPLETE

PR #891 merged as `bc76f27d3a2e464fa39580d07382e3fae20e1c15`.

Shipped final ownership:

- result-capture contracts in `@darkfactory/protocol`;
- structured extraction and code-result truth in `@darkfactory/core`;
- capture-schema CLI behavior in `@darkfactory/cli`;
- routed provider-enforced judgement extraction through the normal candidate/account/quota path;
- natural-stop code truth from deterministic workspace/scope/#341 verification/commit evidence;
- deletion-bound result-capture compatibility bridges removed.

#358 must consume this shipped contract directly.

#### #358 → PR #894 — graph-native production orchestration

Current state:

- the active PR remains draft and its last completed head CI/docs are green;
- prior fabricated/swallowed success paths have been narrowed/removed;
- durable production handler ownership is still under deletion-bound `harness/src/graph/production-handlers.ts`, so the Request is not terminal.

Remaining work:

1. consume the merged #329 result contract directly;
2. move durable graph production mechanisms into final core/protocol/capability owners;
3. inject workspace/GitHub/quota effects instead of importing deletion-bound implementations into core;
4. source Planning/review/alignment from real routed contracts and repository state;
5. prove persisted effect identity, exactly-once external-event resume and fail-closed effect outcomes;
6. remove the superseded harness production-handler owner and complete semantic review/alignment.

Do not create another transitional orchestration layer while waiting for #329.

#### #317 → PR #899 — truthful mutation evidence and branch repair

Current state:

- typed mutation evidence/claim contracts are already in `@darkfactory/protocol` and `@darkfactory/core`;
- exact-target/fail-closed repair work has progressed and aggregate CI/docs are green;
- conflict-repair execution still has deletion-bound harness ownership;
- actual graph re-entry remains dependent on the real #358 resume interface.

Remaining work:

1. place the remaining deterministic repair mechanism in its final core/git-capability owner;
2. keep default/base, commit, push and mutation outcomes fail-closed and evidence-backed;
3. use detected verification on repaired state;
4. replace metadata-only readiness with actual #358 graph re-entry/resume;
5. complete review/alignment after rebasing on the final #358 interface.

Do not make #317 wait for all of #384. Move only the mechanism required by #317 into the settled final git/core ownership; #384 can extend that same substrate later.

### Independent credential lane

#### #422 → PR #931 — final machine credential custody

`@darkfactory/keychain` is the only machine/harness credential owner.

The active PR now carries the major missing final-owner work: borrowed-source custody, external file/keyring import, provider importers, OAuth/login, auth metadata, redaction/scanning/diagnostics, encrypted transfer, browser isolation and vault persistence.

Current validation: PR #931 head `6ea451f` has green CI, docs preview, bound-issue verification, board automation and formatting.

Remaining work:

1. finish removal of remaining temporary secret/credential custody facades under `harness/`;
2. retain the green browser/private-key isolation boundary while removing those facades;
3. record the final F14 integrated/rejected disposition;
4. delete `recovery/f14-borrowed-refresh` once no unique required state remains;
5. complete semantic review/alignment and merge.

#248 consumes #422 rather than creating another credential owner. Its remaining responsibility is provider-facing login/multi-account behavior and `df login/logout` product integration through keychain + CLI.

### Active hook recovery lane

#339 remains open after PR #917 landed final capability-owned `tests-touched`, conventional-commit and branch-name behavior.

Remaining work is deterministic invocation at required mutation/CI trigger points, rule `enforced_by` validation, diagnostics, binding/security hooks, applicable format/English/TSDoc/docs hooks, shared local/CI execution and final F47 disposition. Never recreate `harness/src/hooks/*`.

## 4. Core dependency joins

The critical production-engine dependency path is:

```text
#341 complete
      ↓
#329 complete
      ↓
#358 / PR #894 — final-owner orchestration + durable resume
      ↓
#317 / PR #899 — actual graph re-entry on the shipped #358 interface
      ↓
#359 — df production engine completion / legacy production-owner retirement
```

#317's typed evidence and deterministic repair work may continue before #358 merges. Only its final graph re-entry/resume step is serialized behind #358.

### Join A — #329 — COMPLETE

PR #891 merged green as `bc76f27d3a2e464fa39580d07382e3fae20e1c15`.

### Join B — #358

Immediately rebase/refresh #894 after #891 lands, finish final-owner production orchestration and prove durable resume/idempotency.

Join B condition: #358 is merged/green with no production scripted success, swallowed external-effect failure or durable production-handler ownership left under deletion-bound harness code.

### Join C — #317

Refresh #899 on the shipped #358 interface and replace `readyForReentry`-style metadata with actual graph re-entry.

Join C condition: #317 is merged/green with typed exact mutation evidence, fail-closed repair effects, final ownership and real graph re-entry.

### Join D — #359

Execute #359 immediately after #329 + #358 + #317 are merged.

#359 closes only when:

- df is the sole normal mutating dispatcher for the core Request lifecycle;
- Planning/review/alignment/check/merge behavior uses shipped final owners;
- interruption/resume does not duplicate completed deterministic effects;
- completion/mutation evidence is truthful and auditable;
- a real df-only Request lifecycle completes end to end;
- core lifecycle responsibilities no longer depend on legacy Python or deletion-bound harness owners.

#359 is an engine-completion/deletion gate, not final product completion.

## 5. Parallel workstreams

### Credentials and provider authentication

Run now:

- #422 final keychain/F14 convergence;
- #248 provider-specific login/multi-account product behavior on top of #422 interfaces once each needed keychain contract is stable.

Then:

- #252 provider-backed image/video generation once its actual provider/login dependencies are available.

No credential custody may be introduced outside `@darkfactory/keychain`.

### Git, governance, hooks and recovery

Run stable work now:

- #339 deterministic hook invocation, rule binding/diagnostics and shared local/CI enforcement;
- #384 deterministic git primitives that do not require the unsettled resume contract;
- #388 intake/provenance/secret/request-binding pieces that use already-shipped primitives.

After #358 persisted run/resume interfaces are stable:

- finish #384 conflict persistence/resume integration;
- #385 Epic/Request relationship model;
- #332 graph-native parallel chunk/worktree execution;
- #388 deep resume/reconciliation integration.

After #384 + #358 + #385 stabilize:

- #386 stacked PR topology/restack/dependency-aware merge order.

### Operator surfaces

Continue against stable package contracts:

- #403 supported operator CLI;
- #251 interactive TUI using the same command/runtime metadata;
- #425 shared GitHub-backed operator application in `@darkfactory/web`;
- #390 live browser-safe operator/quota transport and deployment acceptance.

Do not create a second state backend, browser keychain path or duplicate command model.

### Documentation

- #336 finishes shared PR-base/local/CI docs-impact enforcement through the final #339 hook surface, then the late PRD truth pass.
- #337 remains the final repository-wide current-truth contradiction audit after release-affecting product surfaces stabilize.

There is one documentation compiler/content graph and one first-party renderer.

### Release engineering

Continue #360 continuously where interfaces are stable:

- publish/package metadata;
- source-free npm/native artifact layout;
- runtime/capability/data assets;
- installers/updaters;
- native/platform smoke matrix;
- clean-directory packed-command verification;
- prebuilt `@darkfactory/web` bundle;
- checksums and exact source provenance.

Do not publish while accepted release-affecting behavior is still changing. Publish one final supported release only after all release-affecting #68 Requests are terminal.

## 6. Recovery and branch hygiene

Only this recovery ref remains intentionally active:

- `recovery/f47-hooks` → #339.

F14 has received terminal disposition under #422 and `recovery/f14-borrowed-refresh` has been deleted.

A recovery ref exists only while it contains unresolved unique required state. Record final disposition in the owning Request and delete the ref immediately once that state is integrated, rejected or fully subsumed.

The rejected #358 ref `feature/wire-graph-executor-handlers-and-graph-native-orch` has been deleted. The active #358 vehicle is PR #894 on `feat/graph-native-production-orchestration`.

The rejected #329 ref `feature/results-are-captured-when-a-model-stops-without-js` was incorrectly recreated by an autonomous resume and produced invalid lockfile-only PR #952. PR #952 is closed; this ref must be deleted again and must not be reused. The only active #329 vehicle is PR #891 on `feat/natural-stop-result-truth`.

The generated #384 ref `feature/df-supports-deterministic-common-git-workspace-ope` produced invalid lockfile-only PR #953 while claiming completion from deletion-bound harness state. PR #953 is closed; delete this ref and do not reuse it as #384 implementation evidence.

After an active PR merges, remove its topic branch when safe. `gh-pages` is a deployment branch and is excluded from implementation-branch cleanup.

Do not keep historical branches as archives.

## 7. Final release and fleet acceptance

### #360 — final supported release

Freeze only after all release-affecting Requests are terminal and final owners are in place.

At release freeze:

1. finish the #337 truth/documentation audit;
2. remove remaining alternate/deletion-bound owners whose final responsibilities have landed;
3. disposition/delete terminal recovery/topic refs;
4. run final package/API/docs/security/governance checks;
5. freeze the supported product surface and version;
6. publish the final #360 artifact.

There is no migration/parity/canary release.

### #361 — installed fleet acceptance

Validate the published artifact source-free across:

1. DarkFactory;
2. omnis;
3. ChessWithQuests;
4. OdbornaPrace-paper;
5. template-OdbornaPrace;
6. OdbornaPrace-mono.

#361 proves install/update, detection/capabilities, full governed Request lifecycle, interruption/resume, git/hooks/governance, keychain/auth boundaries, docs/web, release/update behavior, recovery provenance and consistent `audit.df`.

Known implementation defects discovered by #361 are fixed in their owning final package/Request and republished; #361 is not a place to defer known implementation.

After #361 is green, rerun the declarable-graph product contract and close #68 only when every required child Request is terminal.

## 8. Immediate execution order

Highest-downstream-value work, in order:

1. **#358 / #894:** refresh on shipped #329, move production orchestration to final owners, prove real persisted exactly-once resume, review/alignment, merge.
2. **#422 / #931 in parallel:** F14 is fully reconciled and deleted; finish aggregate validation, final review/alignment and merge.
3. **#317 / #899:** continue final-owner repair work in parallel, then refresh on merged #358 for actual graph re-entry; review/alignment, merge.
4. **#359:** execute the df-only lifecycle/legacy-retirement completion gate immediately after #358/#317.
5. **#339:** continue deterministic invocation/rule-binding work and remove `recovery/f47-hooks` after terminal disposition.
6. Continue #384/#388 stable pieces, #403/#251/#425/#390 and #360 release construction in parallel; start #385/#332 when #358 state is stable and #386 when #384 + #358 + #385 are stable.
7. Delete the merged #329 topic branch and the invalid generated #329/#384 branches once their unique state is confirmed represented; clean other merged topic branches immediately.

Converge only at the final release freeze, publish once, validate through #361, then close #68.
