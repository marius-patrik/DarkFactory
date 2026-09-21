# DarkFactory — Canonical Completion Plan

## 1. Purpose and authority

This file contains only forward execution state for finishing the DarkFactory harness/product.

- `PRD.md` defines product requirements and final architecture.
- Current GitHub Requests define approved feature-specific behavior.
- Accepted ADRs under `.agents/notes/adr/` define durable architectural decisions.
- GitHub issues, pull requests, checks and refs are the authoritative live implementation state.
- This file owns only cross-Request sequencing, dependency joins and final convergence.

The optimization target is the shortest safe path to `#360 → #361 → #68`. Historical implementation narratives, rejected approaches and recovery provenance belong in GitHub issues, not here.

## 2. Non-negotiable final architecture

- Final first-party packages are `protocol`, `core`, `capability`, `github`, `keychain`, `auth`, `docs`, `cli` and `web`.
- Agentic/product behavior belongs in versioned capabilities.
- `repo.df`, `config.df` and `docs.df` are the configuration/content contracts; `.df` is a filename extension, never a directory.
- Production GitHub effects use `@darkfactory/github`.
- Machine credentials/authentication use `@darkfactory/keychain`; browser/human authentication uses `@darkfactory/auth`.
- `@darkfactory/docs` owns the documentation content graph, `@darkfactory/web` is the sole first-party web application/renderer, and `@darkfactory/cli` owns the supported `df` CLI/TUI surface.
- Remaining `harness/` code is migration/deletion-bound implementation state, not a final ownership target.
- Final package dependencies remain acyclic; browser-safe code cannot import machine-secret/private-key owners.
- When a final owner covers a responsibility, remove the alternate owner instead of maintaining both.
- There is no compatibility, parity, shadow, canary or staged production-migration phase.

Models may judge and edit files. Deterministic repository/GitHub effects and completion truth belong to the engine. Model prose is never evidence of commit, push, merge, verification, delivery or resume.

Use the governed DarkFactory pipeline whenever the currently shipped pipeline can execute the work correctly. Bootstrap/manual work is only for gaps the current pipeline cannot yet safely perform and must rejoin normal governed execution immediately afterward.

## 3. Live checkpoint — 2026-09-21

Canonical branch: `darkfactory` at `be63e238e3470b67e8c2d652048ea50da779e870` when this plan was aligned.

### Shipped foundations

- #341 capability-driven detection, verification/action evidence and repository classification.
- #329 natural-stop/result truth through merged PR #891 (`bc76f27d3a2e464fa39580d07382e3fae20e1c15`).
- #391 unified reviewed Planning lifecycle.
- #422 final machine-credential/keychain ownership through merged PR #931 (`437364d5050e80ac5955ac9e86cf959fea3c1937`).
- #388 dependency-independent recovery provenance/intake foundation through merged PR #962 (`5aa9c33258175c779838c3abc0653438800832b0`).
- #423 browser/session auth boundary, #334/#335/#424 documentation architecture, stable command registry metadata and the initial capability-owned #339 hooks from PR #917.
- Release provenance/integrity guards and the browser-safe static/redacted quota surface.

### Active pull requests

#### #358 → PR #894 — critical path

- Tip: `ab1b08e1c48ad08a8af7d2099fafc1fd159861ad`.
- Relative to current `darkfactory`: 94 commits ahead, 0 behind.
- Current PR-triggered CI, docs preview, binding and board automation are green.
- Graph planning/execution/review/planning/check/validation semantics and production handlers have moved into `@darkfactory/core/graph`.
- Durable ingress identity, continuation state, pending external actions and evidence-backed effect journaling are implemented.
- The remaining repository/GitHub/runtime composition is still explicitly temporary under `harness/src/graph/production-composition.ts` and `harness/src/graph/runtime-composition.ts`; green CI does not make this terminal.

Terminal delta:

1. move production repository/GitHub/runtime composition into the settled final package/capability owners and remove temporary harness ownership;
2. make normal production `df graph dispatch` / production dispatch consume those final adapters through `runGraph`;
3. connect deterministic workspace/git, `@darkfactory/github`, board-sync and quota-resume effects without a second effect/state backend;
4. prove interruption/crash/retry idempotency against real external-effect evidence;
5. run final semantic review/alignment, merge and close #358.

#### #317 → PR #899 — wait for Join B

- Tip: `c045522c08192b9124453e37c20278237aaa8f74`.
- Relative to current `darkfactory`: 14 commits ahead, 145 behind.
- Its own last CI/docs wave is green, but the branch is structurally stale.
- Typed mutation claim/evidence contracts already exist in `@darkfactory/protocol` and `@darkfactory/core`.
- Conflict-repair execution still has deletion-bound harness ownership and real graph re-entry depends on the shipped #358 interface.

Do not repeatedly refresh or extend #899 before #894 merges. After #358 lands, refresh #899 once, preserve valid protocol/core work, move the deterministic repair mechanism into final ownership, replace metadata-only readiness with real graph re-entry/resume, verify and merge.

#### #425 → PR #963 — independent but nonterminal

- Tip: `a8757fb142b7b4f2898c9344cd485e3681a67f1d`.
- Relative to current `darkfactory`: 12 commits ahead, 118 behind.
- Current CI and docs preview are red; observed failures include a web export/router type mismatch and the workspace package-boundary test.
- #963 does not block #358/#317/#359. Refresh it from current canonical state before further feature work, fix the known failures, then continue #425 on the browser-safe transport boundary.

### Current repository mismatch that must disappear by #359

The root workspace still includes `harness`, and root `test`/`typecheck`/`check`/format behavior still delegates primarily through the harness tree. That is current implementation state, not final architecture. #359 must leave normal production and repository verification owned by final packages/capabilities rather than by deletion-bound harness code.

### Pipeline health note

Issue #996 records a failed Auto Format run caused by an unused hook import. That import is absent from current `darkfactory`; treat #996 as a verification item for the next default-branch run unless the failure reproduces. Do not spend a feature lane rebuilding around a stale pipeline-failure issue.

## 4. Critical production-engine path

```text
#341 complete
      ↓
#329 complete
      ↓
#358 / PR #894
      ↓
#317 / PR #899
      ↓
#359
```

### Join B — finish #358 / #894 now

This is the highest-downstream-value work in the repository. Do not start another orchestration owner, effect journal, resume store or compatibility path.

Join B is complete only when the actual production dispatcher executes through final-owned adapters, deterministic external effects are evidence-backed and resumable, crash/retry cannot duplicate completed mutations, deletion-bound harness composition no longer owns production orchestration, and the PR is reviewed/aligned/green and merged.

### Join C — finish #317 / #899 immediately after #894

Refresh once on merged #358. Keep the valid typed mutation evidence. Re-home conflict repair into the same deterministic git/workspace substrate used by the final engine, run detected verification on repaired state, enforce fail-closed push/base/mutation evidence, and re-enter the shipped graph rather than setting a readiness flag.

Do not serialize #317 behind the whole of #384; move only the substrate #317 actually requires. #384 extends the same substrate later.

### Join D — execute #359 immediately after #358 + #317

#359 is the rebuilt-engine completion/deletion gate. It closes only when:

- `df` is the sole normal mutating dispatcher for the core Request lifecycle;
- Planning/review/alignment/check/merge/resume behavior uses shipped final owners;
- a real df-only Request lifecycle completes end to end;
- interruption/resume does not duplicate completed deterministic effects;
- completion/mutation claims are backed by observed state;
- legacy Python mutation/orchestration is deleted or unreachable from normal production;
- no core lifecycle responsibility remains owned only by deletion-bound `harness/` code;
- root/workspace verification no longer depends on harness being the architectural owner.

#359 is not final product completion. Once it lands, use the finished df engine to drive the remaining product work.

## 5. Parallel workstreams

Parallel work is allowed only where it will not be invalidated by the critical joins.

### Hooks and governance — #339

Start from current canonical state, not the rejected generated branch. Continue deterministic core/mutation invocation, official `capabilities/hooks` behavior, `enforced_by` validation, `df hooks run` diagnostics, PR/Request binding, secret scanning and applicable formatting/English/TSDoc/docs hooks. `recovery/f47-hooks` is evidence only and is deleted after terminal disposition.

### Credentials/providers — #248 → #252

#422 is complete. #248 can implement provider-facing multi-account login/logout behavior now through `@darkfactory/keychain` + `@darkfactory/cli`. #252 starts as soon as the specific login/account interfaces it consumes are available; unrelated auth work must not serialize it.

### Git/recovery/topology — #384, #385, #332, #386, #388

- #384 may implement deterministic primitives that do not depend on unsettled resume state. Prioritize only the substrate required by #317 until Join C is complete.
- #388 provenance/intake contracts are already shipped through #962. Do not rebuild them. Its remaining work is actual git reconciliation, graph resume, gate integration and live recovery E2E.
- Start #385 and #332 once the #358 run/resume interface is shipped and stable.
- Start #386 after #384 + #358 + #385 provide the required git/resume/relationship substrate.
- Finish the deeper #388 execution joins against those shipped interfaces rather than inventing temporary recovery machinery.

### Operator surfaces — #403, #251, #425, #390

- #403 can implement stable `@darkfactory/cli` commands now where they do not require unsettled production-run state.
- #251 must preserve/reconcile the recovered TUI implementation evidence; do not regenerate it from clean trunk merely because final ownership moved.
- #425/#390 are independent of the core production-engine join. Repair/refresh #963 in a separate lane, but do not expose machine/keychain credentials or invent a second browser state backend while the live GitHub transport contract is unsettled.

### Release engineering — #360

Continue release construction against stable interfaces: package metadata, source-free artifact layout, runtime/capability/data assets, installers/updaters, native smoke matrix, packed-command verification, prebuilt `@darkfactory/web`, checksums and exact source provenance.

Keep `0.0.0` as the development sentinel. Do not choose/publish the final version until all release-affecting Requests are terminal. There is one final supported release, not a migration/canary sequence.

### Documentation — #336/#337

#336 should converge docs-impact enforcement on the final #339 hook surface. #337 is the final repository-wide current-truth audit after release-affecting surfaces stabilize. Repository docs must remain current-only.

## 6. Branch hygiene

Current valid long-lived/nonterminal refs are:

- `darkfactory` — canonical branch;
- `feat/graph-native-production-orchestration` — PR #894 / #358;
- `fix/conflict-repair-mutation-evidence` — PR #899 / #317;
- `feature/make-darkfactory-web-the-prebuilt-github-backed-op` — PR #963 / #425;
- `recovery/f47-hooks` — temporary recovery evidence for #339;
- `gh-pages` — deployment branch.

The following rejected/generated refs still exist and are cleanup-only; never resume work from them:

- `feature/centralize-all-machine-and-harness-credentials-in`;
- `feature/df-supports-deterministic-common-git-workspace-ope`;
- `feature/finish-the-supported-df-operator-cli-surface`;
- `feature/publish-and-install-df-as-the-supported-release-ar`;
- `feature/results-are-captured-when-a-model-stops-without-js`;
- `feature/rules-are-enforced-by-df-hooks-in-lanes-pipeline-a`.

Delete those refs as soon as the available GitHub/local tooling permits. After each active PR reaches terminal disposition, delete its topic branch. Recovery refs exist only while unique unresolved state remains. Do not retain historical implementation branches as archives.

## 7. Final convergence

### #360 — final supported release

Freeze only after every release-affecting Request is terminal and final owners are in place. At freeze:

1. finish #337 current-truth audit;
2. remove remaining alternate/deletion-bound owners;
3. disposition/delete terminal recovery and topic refs;
4. run final package/API/docs/security/governance checks;
5. freeze the supported product surface/version;
6. publish one final #360 artifact.

### #361 — installed fleet acceptance

Validate the published source-free artifact across:

1. DarkFactory;
2. omnis;
3. ChessWithQuests;
4. OdbornaPrace-paper;
5. template-OdbornaPrace;
6. OdbornaPrace-mono.

#361 must prove install/update, detection/capabilities, the full governed Request lifecycle, interruption/resume, git/hooks/governance, keychain/auth boundaries, docs/web, release/update behavior, recovery provenance and consistent `audit.df`.

Fix defects discovered by #361 in their owning final package/Request and republish. After #361 is green and all required child Requests are terminal, rerun the declarable-graph product contract and close #68.

## 8. Execution scheduler

Use the following scheduling policy to minimize wasted work:

1. **Critical lane:** #894 → #899 → #359. Keep this lane continuously occupied.
2. **Do not rebase stale dependent branches early:** refresh #899 once after #894 merges, not repeatedly before the dependency join.
3. **Independent lanes:** #339; #248/#252; stable #403/#251 work; #425/#390 repair; stable #360 construction; dependency-independent #384 work.
4. **Dependency-triggered lanes:** #385/#332 after #358; #386 after #384 + #358 + #385; deeper #388 execution after its required shipped interfaces exist.
5. **One implementation vehicle per Request.** Rejected/generated refs are never reused.
6. **Green is necessary, not sufficient.** A PR is terminal only when final ownership, Request acceptance, review/alignment and real evidence are complete.
7. **No speculative compatibility work.** If a final owner exists, delete the superseded owner instead of maintaining both.

Converge only at final release freeze, publish once, validate through #361, then close #68.
