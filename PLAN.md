# DarkFactory — Single-Run Completion Plan

## 1. Mission and authority

This plan is optimized for **one strong local orchestrator session** that remains in control until DarkFactory reaches the final `#360 → #361 → #68` end state or encounters a genuinely external blocker that cannot be solved from the repository, local recovery state, GitHub or available credentials.

The orchestrator is the integration authority. It continuously inspects live GitHub/local state, dispatches focused implementation agents into isolated worktrees, joins their outputs in dependency order, runs/re-runs the governed pipeline, resolves integration fallout and immediately dispatches newly unblocked work.

Authority order:

1. `PRD.md` — final product/architecture contract.
2. Current GitHub Request bodies and accepted ADRs — feature-specific/current architectural behavior.
3. GitHub checks, PRs, refs and the local repository/recovery state — live implementation truth.
4. This file — execution DAG, concurrency policy and convergence criteria.

Historical implementation narratives remain in GitHub issues. The orchestrator must not preserve obsolete code, branches, docs or compatibility paths merely because they existed previously.

## 2. Final architecture constraints

All agents implement directly into the final architecture.

- Final first-party packages are `protocol`, `core`, `capability`, `github`, `keychain`, `auth`, `docs`, `cli` and `web`.
- Product/agentic behavior belongs in versioned capabilities, including `git`, `github`, `planning`, `review`, `ci`, `release`, `recovery`, `hooks`, `epics` and `stacks`.
- Remaining `harness/` implementation is deletion-bound migration state. It may be read/recovered but is never selected as a new final owner.
- `@darkfactory/core` owns mechanisms, graph/run state, routing/config mechanisms and deterministic execution kernel behavior.
- `@darkfactory/github` owns production GitHub transport.
- `@darkfactory/keychain` owns machine credentials; `@darkfactory/auth` owns human/browser authentication.
- `@darkfactory/cli` owns the supported command/TUI surface; `@darkfactory/web` owns the single reusable web application.
- `repo.df`, `config.df` and `docs.df` are the current contracts. `.df` is a file extension, never a directory.
- Browser-safe code cannot import machine-secret/private-key/runtime-only implementations.
- Deterministic repository/GitHub effects and completion truth belong to the engine; model prose is never mutation evidence.
- No compatibility, parity, shadow, canary or staged migration program exists. Once final ownership lands, delete the superseded owner.
- Do not create a second graph engine, state backend, effect journal, git engine, command registry, provider catalog, quota model, credential store, docs compiler or web application.

## 3. Single-run orchestrator contract

The orchestrator does not act as a coding agent except for small integration fixes. Its primary job is to keep useful agents running while protecting one canonical integration sequence.

### 3.1 Startup

At the beginning of the run:

1. fetch/prune all refs and inspect `darkfactory`, open Requests/PRs/checks, worktrees, stashes and recovery refs;
2. inventory local recovered state required by open Requests before regenerating anything, especially #251 and `recovery/f47-hooks`;
3. perform the initial branch/worktree cleanup pass defined in §10 before creating new lanes;
4. create one isolated worktree per active implementation lane from the exact intended base;
5. record each lane's Request(s), allowed ownership surface, dependencies and expected terminal evidence;
6. start the critical lane first, then all safe independent lanes immediately.

### 3.2 Agent contract

Every dispatched agent receives:

- the exact Request numbers and current Request bodies;
- the current canonical SHA and any existing PR/recovery branch it must preserve;
- its allowed package/capability/file ownership;
- explicit dependencies and interfaces it may assume;
- required tests/E2E evidence;
- a prohibition on compatibility layers, duplicate owners and unrelated cleanup;
- instruction to inspect existing implementation/recovery state before writing replacement code;
- instruction to return a reviewable commit/branch plus an exact remaining-delta report, never a prose claim of completion.

Agents do not merge their own work, close Requests, rewrite `PLAN.md`, choose the final release version or mutate unrelated lanes. The orchestrator owns those decisions.

### 3.3 Shared-file integration lock

The orchestrator serializes final writes to high-conflict integration files:

- root `package.json` / `bun.lock`;
- root workflow definitions;
- `PRD.md`, `PLAN.md`, `README.md`, `docs/home.md`, `AGENTS.md`;
- shared package export maps when two lanes need the same entrypoint.

Agents may prepare required changes, but the orchestrator rebases/regenerates these files immediately before final verification so parallel lanes do not spend time resolving predictable lockfile/docs conflicts.

### 3.4 Merge discipline

- One active implementation vehicle per independent change set.
- Existing valid PRs are preserved; rejected/generated branches are never reused.
- The orchestrator merges the smallest dependency-unlocking unit as soon as it is terminal.
- After every canonical merge, only agents whose touched surfaces or consumed interfaces changed are refreshed.
- Do not globally rebase every branch after every merge.
- Dependent stale branches are refreshed **once at their dependency join**, not continuously.
- Green CI is necessary but not sufficient: final ownership, acceptance criteria, review/alignment and real evidence must also be satisfied.

## 4. Starting state

Already shipped and consumed, never rebuilt:

- #341 detection/verification/action contract;
- #329 natural-stop/result truth;
- #391 unified Planning lifecycle;
- #422 final keychain ownership;
- #388 recovery provenance/intake foundation from PR #962;
- #423 browser/session auth boundary;
- #334/#335/#424 documentation architecture;
- command registry/capability ABI foundations;
- initial capability-owned #339 hook behavior;
- release provenance/integrity foundations;
- static/redacted quota contracts.

Existing implementation vehicles:

- #358 → PR #894 — real graph runtime/effect implementation; highest-priority completion vehicle.
- #317 → PR #899 — valid mutation-evidence work but stale; do not refresh until #358 merges.
- #425 → PR #963 — useful web shell work but stale/red; independent of the engine critical path.
- `recovery/f47-hooks` — evidence only for remaining #339 semantics.

## 5. Execution DAG

The orchestrator follows this dependency graph, not issue-number order:

```text
BOOT
 │
 ├──────────── independent Wave A lanes ───────────────────────────────┐
 │                                                                     │
 ▼                                                                     │
#358 / #894  ───────────────────────────────────────────────┐          │
 │                                                          │          │
 ├──────────────┬──────────────────────┐                    │          │
 ▼              ▼                      ▼                    │          │
#317/#899      #332                   #385                  │          │
 │                                     │                    │          │
 ▼                                     │                    │          │
#359                                    │                    │          │
 │                                      │                    │          │
 ├──────────► remaining work runs through finished df ◄──────┘          │
 │                                                                      │
 ▼                                                                      │
#384 full ──────────────┐                                                │
 │                      ▼                                                │
 │                    #386                                               │
 │                      │                                                │
 └──────────┬───────────┘                                                │
            ▼                                                            │
          #388 full                                                      │
                                                                         │
Wave A: #339 | #248→#252 | #403+#251 | #425+#390 | #336 stable slice | #360 build
                                                                         │
all feature lanes terminal ──────────────────────────────────────────────┘
                         │
                         ▼
                       #337
                         │
                         ▼
                       #360 freeze/publish
                         │
                         ▼
                       #361 fleet acceptance
                         │
                         ▼
                       #68
```

## 6. Wave A — dispatch immediately and in parallel

Wave A begins during bootstrap. Agents work in isolated worktrees and must not wait for the production-engine lane unless they consume an unsettled interface.

### Agent A — critical runtime: #358 / PR #894

This agent gets the strongest model and exclusive priority.

The branch already contains real `df graph dispatch`, `runGraph`, production model handlers, deterministic repository/GitHub effects, quota resume, board sync, durable run state and effect deduplication. Do **not** rebuild those mechanisms.

Terminal delta:

1. refresh #894 only as required to integrate current canonical changes;
2. move temporary production composition out of `harness/src/graph/production-composition.ts` and `runtime-composition.ts` into the settled final core/capability/package owners;
3. ensure normal production event ingress uses the real df graph runtime and no legacy Python/local lane loop remains the normal mutation path;
4. preserve one effect/state backend and fail-closed mutation evidence;
5. add/finish a real interruption/crash/retry E2E proving completed Git/GitHub effects are not repeated;
6. run semantic self-review against #358/PRD, fix all findings, run full detected verification and return the branch for orchestrator merge.

**Join J1:** orchestrator merges #894 and closes #358 only when the production runtime is final-owned and the E2E evidence is real.

### Agent B — hooks/governance: #339

Start from current `darkfactory`, using `recovery/f47-hooks` only as evidence.

Implement the remaining final-owner delta:

- deterministic core/mutation invocation at required tool/edit/commit/push/PR/CI triggers;
- official `capabilities/hooks` registry/behavior only;
- `.agents/rules enforced_by` validation;
- `df hooks run` diagnostics through the shared command registry;
- PR/Request binding, secret scanning and applicable formatting/English/TSDoc/docs hooks;
- identical local/CI rule execution;
- final F47 disposition.

Never restore `harness/src/hooks/*`. Hold only pieces that genuinely consume an interface being changed by J1; everything else should be completed during Wave A.

### Agent C — provider/auth/media: #248 → #252

Own the provider-facing account/login path without touching credential custody.

First finish #248 through `@darkfactory/keychain` + provider declarations + `@darkfactory/cli`:

- provider-specific OAuth/device/PKCE/pasted-code flows actually required by current providers;
- multiple accounts and isolated credential slots;
- logout/cooldown cleanup scoped to one account;
- borrowed credentials remain non-destructive;
- current provider/account/router/quota integration and tests.

As soon as the required login/account interface is stable, continue directly into #252:

- Gemini image/video model capability declarations;
- live catalog + TTL/offline fallback;
- correct task-capability gating from shipped #365;
- per-account quota/failover integration;
- no hard-coded routing catalog and no legacy Python provider path.

The orchestrator may split #252 to a child agent once #248's consumed interface is frozen.

### Agent D — operator surface: #403 + #251

This lane owns `@darkfactory/cli`/TUI integration and must begin with recovery.

1. inspect the actual local recovery root/worktrees/refs/stashes required by #251;
2. preserve the recovered `pi-tui` implementation before reconciling it;
3. implement stable dependency-independent #403 commands now: command registry parity, `df status`, expanded `df doctor`, `df work` shell/contract and install/update command contract where it does not require final release bytes;
4. reconcile recovered TUI into `@darkfactory/cli`, preserving bare-`df` TTY behavior, CI/provider/quota panes and dynamic model picker;
5. after J1/J3, bind run/resume/work-queue views to the final engine state instead of temporary harness state;
6. leave source-free installer acceptance to #360 but make the operator contract final before release freeze.

Avoid duplicating command metadata or provider/quota state already owned elsewhere.

### Agent E — web/dashboard: #425 / PR #963 + #390

Refresh #963 once from current canonical state and fix its known package/type/test failures first.

Then finish the shared `@darkfactory/web` application:

- one prebuilt host/base-path-agnostic app artifact;
- docs as a first-class route from the native docs content graph;
- Request/Epic/Planning/recovery/PR/stack/check/run/release/graph/capability/config/audit/operator navigation/surfaces;
- quota dashboard using canonical provider/account/quota contracts;
- Pages deep-link/static-content behavior;
- browser/keychain isolation and explicit disconnected/error states.

Resolve the live GitHub transport contract explicitly rather than leaving #425/#390 blocked. The implementation must keep machine/App secrets out of the browser and must not create a second application state backend. If the existing opaque `@darkfactory/auth` session requires a broker transport, implement a narrowly typed/allowlisted GitHub transport contract owned by `@darkfactory/auth`/`@darkfactory/github`; do not turn it into a generic proxy.

Do not let this lane block J1/J2/J3.

### Agent F — release construction: #360 pre-freeze

Build every release component whose input contract is already stable:

- package metadata and lockstep-version machinery while preserving `0.0.0` development sentinel;
- source-free Node-compatible npm artifact;
- native binaries/platform matrix;
- runtime/graph/schema/capability/data assets;
- installers/updaters;
- prebuilt `@darkfactory/web` asset packaging;
- clean-directory packed-command tests;
- checksums and exact source provenance.

Do not publish, choose the final SemVer or claim #360 terminal during Wave A. Continuously rebase only when an actually consumed artifact interface changes.

### Agent G — docs-impact foundation: #336

Implement the stable enforcement part of #336 now, using current #341 detection and the final #339 hook surface as it becomes available:

- PR-base comparison;
- fail-closed diff computation;
- valid empty-diff handling;
- `Docs: none (<reason>)` validation;
- README generated-projection drift enforcement.

Do not perform the final prose/current-truth rewrite yet. That belongs to #337 after product behavior freezes.

## 7. Join J1 — immediately fan out on the shipped graph runtime

The instant #358 merges, the orchestrator broadcasts the new canonical SHA/interface and dispatches three newly unblocked lanes without waiting for unrelated Wave A work.

### Agent H — critical conflict/re-entry: #317 / PR #899

This becomes the new strongest-model critical agent.

Refresh #899 **once** onto merged #358. Preserve valid protocol/core mutation-evidence work; discard stale harness ownership.

Complete:

- final deterministic branch-update/conflict-repair ownership in the shared git/core-capability substrate;
- dynamic base resolution;
- deterministic update first, model conflict resolution only when necessary;
- detected verification on repaired state;
- evidence-backed commit/push with fail-closed SHA truth;
- structural rejection/removal of unsupported mutation claims;
- actual re-entry into the shipped graph/check/merge path after repair;
- tests for clean update, conflict repair, verification failure, false write claims and resumed graph execution.

**Join J2:** merge #899 and close #317. Do not wait for full #384.

### Agent I — parallel chunks: #332

Use the shipped #358 persisted graph/worktree interface directly.

Implement:

- smallest independently verifiable chunk planning with scope/dependency metadata;
- graph-native parallel execution in isolated engine worktrees;
- normal routing/tier/provider selection;
- #329 completion truth;
- deterministic verified merge-back in dependency order;
- sibling failure isolation and persisted resume;
- conflict resolution as normal graph work, not a side lane loop.

### Agent J — Epic/multi-Request model: #385

Implement first-class Request relationship/shared-delivery semantics against the shipped graph/run model and GitHub durable state. This agent must produce the relationship substrate consumed later by stacks and recovery; it must not create a separate project/task database.

## 8. Join J2 — production cutover: #359

As soon as #317 merges, dispatch Agent K on #359. This remains critical even while Agents I/J and Wave A agents continue.

Agent K performs completion/deletion, not a compatibility migration:

1. make df the sole normal mutating dispatcher for the core Request lifecycle;
2. remove/bypass legacy Python production orchestration and obsolete workflows/tests tied only to it;
3. remove remaining core lifecycle production ownership from deletion-bound `harness/`;
4. move root `test` / `typecheck` / `check` / format ownership to final packages/capabilities rather than harness-first delegation;
5. prove the complete #391 lifecycle with a **real df-only Request E2E**;
6. interrupt/resume the live lifecycle and prove completed deterministic effects are not duplicated;
7. prove no-op/model prose cannot fabricate delivery;
8. run full repository verification and current-truth review.

**Join J3:** merge #359 only when DarkFactory can reliably develop itself through df. From this point onward, the orchestrator routes remaining implementation through the finished governed df pipeline wherever possible; manual/local agent commits are only for repairing df itself.

## 9. Post-J3 completion fan-out

Immediately after #359, dispatch/continue the remaining feature-completion lanes through the now-working pipeline.

### Agent L — full deterministic git: #384

Extend the shared substrate used by #317 into the complete product:

- status/diff/log/fetch;
- branch create/switch;
- rebase/merge/cherry-pick;
- structured conflict state;
- continue/abort;
- dirty-worktree protection;
- lease-safe rewritten pushes;
- graph-persisted conflict/resume integration;
- #339 hook invocation;
- CLI diagnostics and temp-repository integration tests.

Do not create another git executor/state engine.

### Agent M — stack orchestration: #386

Start when #384 and #385 consumed interfaces are stable.

Implement explicit stack topology, restack/update through the shared git substrate, dependency-aware checks/merge order, conflict/re-entry behavior through #317/#358 and durable GitHub-backed state. No stack-specific git engine.

### Agent N — full recovery product: #388

Start its execution portion as soon as the interfaces it actually consumes are present; terminal completion waits for #384/#385/#386.

Consume the already-shipped #962 provenance contract and implement:

- adoption of exact clean/dirty/untracked local implementation state;
- safe secret/publication blocking;
- deterministic reconciliation through #384;
- normal #391 Planning/review/approval/alignment/merge gates;
- multi-Request and stack bindings through #385/#386;
- durable interruption/resume;
- cleanup eligibility;
- a real recovered DarkFactory lane E2E.

Never create another recovery state model.

### Finish Agents D/E/F/G

At J3 the orchestrator tells operator, web, release and docs-impact agents to replace any held lifecycle assumptions with final interfaces and finish their remaining acceptance criteria.

## 10. Branch, worktree and recovery cleanup

Branch hygiene is part of implementation, not a post-project courtesy. The orchestrator owns it continuously throughout the single run.

### 10.1 Initial cleanup pass

Before dispatching new implementation lanes:

1. fetch all remotes and run a prune so deleted/stale remote-tracking refs are removed locally;
2. inventory every local branch, remote branch, worktree, stash and recovery ref;
3. classify each non-canonical ref as exactly one of:
   - **active implementation** — bound to a current Request/PR and contains unresolved work;
   - **recovery evidence** — unique recovered state still required by a current Request;
   - **deployment/system** — e.g. `gh-pages`;
   - **cleanup-only** — merged, closed, rejected, superseded, duplicated, abandoned or containing no unique unresolved state;
4. compare cleanup candidates against canonical and their owning Request/PR before deletion so unique commits/dirty bytes are never lost;
5. remove stale worktrees first, then delete the corresponding local branches and remote branches;
6. expire/delete stashes only after their contents are either represented by a durable recovery ref/commit or explicitly recorded as discarded with rationale;
7. run `git worktree prune`, remote prune and a second ref inventory to prove the cleanup actually took effect.

At the current checkpoint, the following generated/rejected remote refs are **cleanup-only unless fresh inspection proves unique unrepresented state**:

- `feature/centralize-all-machine-and-harness-credentials-in`;
- `feature/df-supports-deterministic-common-git-workspace-ope`;
- `feature/finish-the-supported-df-operator-cli-surface`;
- `feature/publish-and-install-df-as-the-supported-release-ar`;
- `feature/results-are-captured-when-a-model-stops-without-js`;
- `feature/rules-are-enforced-by-df-hooks-in-lanes-pipeline-a`.

The orchestrator deletes these during startup after verifying the corresponding rejected/terminal work is already represented in GitHub/current canonical state.

The following refs are protected from startup deletion:

- `darkfactory` — canonical;
- `feat/graph-native-production-orchestration` — #358 / PR #894;
- `fix/conflict-repair-mutation-evidence` — #317 / PR #899;
- `feature/make-darkfactory-web-the-prebuilt-github-backed-op` — #425 / PR #963;
- `recovery/f47-hooks` — temporary unique recovery evidence for #339 until terminal disposition;
- `gh-pages` — deployment/system ref.

### 10.2 Continuous post-merge cleanup

Immediately after every terminal merge/disposition, before forgetting the lane:

1. record the merge/rejection/supersession SHA and owning Request disposition;
2. remove the lane worktree if it is no longer needed;
3. delete its local topic branch;
4. delete its remote topic branch;
5. prune remote-tracking refs;
6. remove temporary integration/review branches created only for the completed join;
7. delete any associated recovery ref only when its unique required state has been integrated, explicitly rejected or fully subsumed and that disposition is durable in the owning Request/audit record;
8. keep `gh-pages` and any other explicitly required deployment/system refs outside implementation cleanup.

Merged topic branches are not archives. GitHub issues/audit evidence are the archive.

### 10.3 Recovery cleanup

Recovery refs/worktrees/stashes require stricter handling:

- never delete recovery state merely because a replacement implementation exists;
- first prove every unique source commit/dirty/untracked byte has either been integrated, preserved in durable provenance, or explicitly rejected with rationale;
- #339 owns terminal disposition of `recovery/f47-hooks`;
- #251 recovery inventory must be preserved before TUI reconciliation;
- #388 must expose cleanup eligibility for productized recovery inputs;
- once terminal disposition exists, remove the local recovery worktree, local branch/ref, remote recovery branch and obsolete stash in the same orchestrator run.

### 10.4 Final zero-stale-ref audit

Before #360 release freeze and again before closing #68, require:

- no rejected/generated branches;
- no merged topic branches;
- no abandoned integration/review branches;
- no stale worktrees;
- no unexplained stashes;
- no recovery refs lacking an active unresolved Request and explicit unique-state rationale;
- no remote-tracking refs for already deleted branches;
- only canonical, deployment/system and genuinely active refs remain.

Any unexpected ref blocks final closure until classified and cleaned or explicitly justified as required current state.

## 11. Continuous integration algorithm

Throughout the run, the orchestrator repeats this loop:

1. inspect agent progress and current GitHub checks;
2. immediately review any completed dependency-unlocking branch;
3. reject architectural drift before merge rather than patching it later;
4. run detected local verification and the repository pipeline;
5. fix real failures in the owning lane; rerun transient infrastructure failures without product changes;
6. merge terminal work;
7. immediately run the §10 post-merge branch/worktree/ref cleanup for that lane;
8. broadcast only the changed interfaces/SHA to affected agents;
9. dispatch newly unblocked downstream work immediately;
10. reconcile shared lockfile/export/workflow changes under the integration lock;
11. close Requests only from acceptance evidence, not agent summaries.

Do not allow idle time merely because another independent PR is waiting on CI. Agents continue on work that cannot be invalidated by that pending merge.

## 12. Final truth/documentation pass — #337

When every release-affecting behavior is terminal, dispatch one fresh high-context review agent over the entire canonical tree.

It must:

- compare `PRD.md`, accepted ADRs, Request contracts and actual code;
- remove stale/historical/superseded repository documentation;
- ensure only accepted ADRs remain;
- finalize #336's PRD/current-product documentation obligations;
- regenerate README from canonical docs source;
- verify rules, package docs, workflow comments and generated API docs describe current owners only;
- remove stale harness/legacy terminology and dead paths;
- run docs generation and contradiction checks.

The agent does not redesign the product during this pass. Any real implementation defect found is sent back to the owning feature lane, fixed, merged and then re-audited.

## 13. Release freeze — #360

After #337 is clean and every release-affecting Request is terminal:

1. regenerate/reconcile the workspace lockfile and release metadata from canonical;
2. choose the final version once;
3. build all npm/native/web/capability/runtime assets from the exact release commit;
4. execute clean-directory/package/native smoke tests on every declared supported target;
5. verify checksums/source provenance and installer/update behavior;
6. verify `df --version`, `doctor`, `status`, `route`, `ci status`, offline `run`, TUI and packaged web assets;
7. publish exactly one supported final release;
8. close #360 from artifact evidence.

No canary/migration release is created.

## 14. Fleet acceptance — #361

The orchestrator installs the published artifact source-free into all six consumers:

1. DarkFactory;
2. omnis;
3. ChessWithQuests;
4. OdbornaPrace-paper;
5. template-OdbornaPrace;
6. OdbornaPrace-mono.

For each consumer prove:

- install/update and config detection;
- capability resolution;
- normal governed Request lifecycle;
- Planning/review/approval/alignment/check/merge;
- interruption/resume;
- git/hooks/governance;
- provider/keychain/auth boundaries;
- TUI/CLI;
- docs/web deployment;
- release/update behavior;
- recovery provenance where applicable;
- consistent `audit.df`.

Any defect returns immediately to its owning DarkFactory package/Request, is fixed, republished and retested. #361 is not a backlog.

## 15. Terminal closure — #68

Close #68 only when:

- every required child Request is terminal;
- #361 is closed green;
- the declarable graph still deterministically renders/validates required workflow behavior;
- no unresolved unique recovery work remains;
- the §10 zero-stale-ref audit passes: rejected/generated/merged topic branches, stale worktrees, obsolete stashes and terminal recovery refs are removed except explicitly required deployment/system/current-work refs;
- repository docs describe current state only;
- DarkFactory is source-free installable and self-hosting through its own governed df pipeline.

## 16. Orchestrator stop conditions

The single run ends only at one of these conditions:

### Success

`#360 → #361 → #68` are terminal, final release/fleet evidence exists, the §10 zero-stale-ref audit is clean on both local and remote state, and canonical `darkfactory` is green.

### Genuine external block

A required external service, credential/authorization, unavailable recovered local bytes or platform outage prevents further progress and no repository-local workaround is valid.

Before stopping on an external block the orchestrator must still:

- merge every independent completed lane that is terminal;
- leave all unfinished branches rebased or clearly checkpointed;
- record exact blocker evidence and the smallest resume action;
- ensure `PLAN.md` and current Request bodies reflect the actual remaining delta.

Ordinary merge conflicts, test failures, stale branches, missing implementation, architectural ambiguity resolvable from PRD/Requests, transient CI failures and agent failures are **not** stop conditions.
