# DarkFactory — Final Completion Plan

## 1. Mission

Finish DarkFactory directly in its final architecture as fast as safely possible.

This is not a migration program. There is no compatibility phase, shadow engine, parity period, canary architecture, dual ownership or preservation of superseded implementation. Existing code and recovery state are inputs; only the final product contract matters.

The run ends only when DarkFactory is:

- self-hosting through the TypeScript `df` runtime;
- free of production ownership in deletion-bound legacy paths;
- source-free installable from a real release;
- proven across the declared consumer fleet;
- documented from current implementation truth;
- clean of obsolete branches, worktrees, recovery refs and dead product code.

Authority order:

1. `PRD.md` — final product and architecture.
2. Current Request acceptance criteria and accepted ADRs.
3. Current repository implementation and observed verification evidence.
4. This file — sequencing, integration and completion policy.

When an old Request body or recovered implementation assumes an obsolete owner such as `harness/`, preserve the required behavior but implement it in the final owner defined by the PRD.

## 2. Non-negotiable final architecture

Final first-party packages:

- `@darkfactory/protocol`
- `@darkfactory/core`
- `@darkfactory/capability`
- `@darkfactory/github`
- `@darkfactory/keychain`
- `@darkfactory/auth`
- `@darkfactory/docs`
- `@darkfactory/cli`
- `@darkfactory/web`

Agentic/product behavior belongs in versioned capabilities such as `git`, `github`, `planning`, `review`, `ci`, `release`, `recovery`, `hooks`, `epics` and `stacks`.

Rules:

- `harness/` is deletion-bound migration/recovery source, never a new final owner.
- `@darkfactory/core` owns the deterministic runtime kernel, graph/run state and execution mechanisms.
- `@darkfactory/github` owns production GitHub transport.
- `@darkfactory/keychain` owns machine credentials; `@darkfactory/auth` owns human/browser authentication.
- `@darkfactory/cli` owns the supported CLI/TUI; `@darkfactory/web` owns the single reusable web application.
- `repo.df`, `config.df` and `docs.df` are the only current configuration contracts.
- Model prose is never evidence that a repository mutation occurred.
- Browser code cannot import machine-secret/private-key/runtime-only implementations.
- There is one graph engine, state model, effect journal, git substrate, command registry, provider catalog, quota model, credential store, docs compiler and web application.
- When final ownership lands, delete the superseded owner immediately.

## 3. Integration policy

The orchestrator owns integration. Implementation workers own bounded changes.

### 3.1 Immediate baseline reset

At the start of the final completion push:

1. fetch and prune all refs;
2. inspect all open PRs, branches, worktrees, stashes and recovery refs;
3. merge the plan-only coordination PR;
4. rebase every remaining active PR onto the resulting canonical `darkfactory` head;
5. resolve conflicts by preserving final-architecture work and dropping superseded ownership;
6. rerun each PR's required checks;
7. delete branches that have no unresolved unique state.

This one-time global rebase establishes one clean baseline. After it, rebase only when a PR's consumed interface or base materially changes.

### 3.2 Merge discipline

- Merge the smallest dependency-unlocking unit as soon as it is terminal.
- Green CI is necessary but not sufficient: acceptance criteria, final ownership and real evidence must also hold.
- Do not wait for unrelated lanes before merging a terminal dependency.
- Do not preserve transitional abstractions to reduce merge conflicts.
- Shared integration files (`package.json`, `bun.lock`, workflows, exports and top-level docs) are reconciled at merge time against canonical.
- Every merged lane is cleaned up immediately: worktree, local branch, remote topic branch and stale tracking refs.
- GitHub Requests/issues are the historical record; merged branches are not archives.

## 4. Critical completion spine

Everything is organized around one dependency spine:

```text
#358 graph/runtime
      ↓
#317 truthful mutation evidence + branch repair/re-entry
      ↓
#359 df-only production cutover + legacy production deletion
      ↓
remaining product features completed through df
      ↓
#337 final implementation/docs truth audit
      ↓
#360 final release
      ↓
#361 fleet acceptance
      ↓
#68 closure
```

No parallel work may slow this spine.

### Gate A — #358: final graph runtime

Complete the existing graph implementation rather than rebuilding it.

Terminal requirements:

- production graph mechanisms live in final package/capability owners;
- temporary production composition under `harness/` is gone;
- normal event ingress executes through the real graph runtime;
- one durable run/effect model owns replay and external-effect deduplication;
- Git/GitHub mutation results fail closed;
- interruption/crash/retry tests prove completed deterministic effects are not duplicated;
- full verification is green.

Merge immediately when terminal.

### Gate B — #317: branch repair and mutation truth

After #358 lands, finish the existing mutation-evidence work against the shipped runtime.

Terminal requirements:

- deterministic update first;
- model-assisted conflict resolution only when deterministic git cannot finish;
- detected verification runs on repaired state;
- commit/push truth is evidence-backed and SHA-checked;
- unsupported mutation claims are rejected structurally;
- repaired execution actually re-enters the normal graph/check/merge path;
- implementation lives in the final shared git/core/capability substrate, not `harness/`.

Merge immediately when terminal.

### Gate C — #359: production cutover

This is deletion/completion, not migration.

Terminal requirements:

- `df` is the sole normal mutating dispatcher for the governed Request lifecycle;
- legacy Python production orchestration is removed or no longer part of production;
- core lifecycle ownership is removed from deletion-bound `harness/`;
- root test/typecheck/check/format commands are owned by final packages/capabilities;
- a real df-only Request E2E passes;
- interruption/resume does not duplicate completed effects;
- no-op/model prose cannot fabricate delivery;
- repository-wide verification is green.

After this merge, use the finished df pipeline for remaining product work wherever possible.

## 5. Parallel completion groups

Run these concurrently whenever they do not consume an unsettled critical-spine interface.

### Runtime/governance

- #339 — final hooks/rules enforcement in capability/final runtime owners.
- #332 — graph-native fine-grained parallel chunks after the #358 interface is available.
- #385 — first-class Epic/multi-Request relationships.
- #384 — complete deterministic git substrate after #359, extending the substrate used by #317.
- #386 — stacked PRs after #384 + #385.
- #388 — full governed recovery product using shipped provenance plus final git/Request/stack interfaces.

### Providers/operator

- #248 — provider login/account flows through keychain + final provider/CLI owners.
- #252 — image/video provider capabilities once the consumed #248 interfaces are stable.
- #403 — complete supported operator CLI.
- #251 — recover and integrate the TUI into `@darkfactory/cli`; recovered bytes are evidence/input, not an ownership constraint.

### Web

- #425 — one prebuilt `@darkfactory/web` application.
- #390 — quota/dashboard functionality inside that same application.

The web app must remain browser-safe, host/base-path agnostic and GitHub-backed without becoming a second DarkFactory state backend.

### Release/docs

- #360 may build stable release machinery early, but final versioning/publication waits for product freeze.
- #336 owns deterministic docs-impact/currentness enforcement.
- #337 is the final current-truth cleanup after behavior freezes.

## 6. Delete aggressively

Finishing means reducing the repository to the final product.

Delete as soon as final ownership exists:

- legacy Python production orchestration;
- superseded `harness/` production implementations;
- duplicate runtime/config/state/effect/git/provider/docs/web owners;
- compatibility/parity/shadow/canary code;
- obsolete workflows and tests that exist only for removed architecture;
- historical/superseded repository documentation;
- unused scripts/assets/config aliases;
- merged/rejected/generated topic branches;
- stale worktrees and terminal recovery refs.

Do not delete unique recovery state until it is integrated or explicitly rejected with durable provenance.

## 7. Branch and recovery hygiene

At every integration checkpoint classify each non-canonical ref as:

- active implementation;
- required recovery evidence;
- deployment/system;
- cleanup-only.

Only the first three may remain.

Protected categories while active:

- canonical `darkfactory`;
- open PR heads;
- recovery refs explicitly required by an open Request;
- deployment configuration and generated Pages artifacts.

Before release freeze and before #68 closure require:

- no merged/rejected/generated topic branches;
- no stale worktrees;
- no unexplained stashes;
- no recovery refs without an active unresolved Request and unique-state rationale;
- no obsolete remote-tracking refs.

## 8. Verification contract

Every merged change must use observed evidence appropriate to its scope.

Required final evidence includes:

- deterministic unit/integration tests;
- real graph interruption/resume and effect-idempotency tests;
- real branch conflict repair and graph re-entry;
- real df-only governed Request lifecycle;
- source-free package/install/update smoke tests;
- CLI/TUI and web acceptance;
- provider/account/quota behavior;
- hooks/governance behavior;
- recovery intake through normal gates;
- stacked/multi-Request behavior;
- generated docs/README consistency;
- release checksum/provenance verification.

A model summary is never acceptance evidence.

## 9. Final truth pass — #337

After all release-affecting behavior is implemented:

- compare PRD, accepted ADRs, Requests and actual code;
- remove every stale or historical repository description;
- retain only currently accepted ADRs;
- regenerate README from canonical docs content;
- remove legacy harness/Python terminology where the implementation is gone;
- remove dead paths, aliases and unused assets;
- rerun the full repository verification.

Implementation defects found here go back to their owning code surface and are fixed before release.

## 10. Release — #360

From one frozen canonical commit:

1. choose the final version once;
2. build Node-compatible npm distribution, native binaries and required runtime/capability/web assets;
3. run clean-directory/package/native smoke tests on every declared supported target;
4. verify checksums and source provenance;
5. verify source-free install/update;
6. verify the final CLI/TUI/web/runtime surface;
7. publish one supported final release.

No canary or migration release.

## 11. Fleet acceptance — #361

Install the published release source-free into all six declared consumers and prove the final product contract.

A fleet failure is a DarkFactory defect: fix it in the owning final package/capability, republish and rerun acceptance.

#361 closes only when fleet evidence is green.

## 12. Terminal closure — #68

Close #68 only when:

- every required Request is merged, explicitly rejected/superseded or otherwise terminal with rationale;
- #361 is green;
- declarable graph generation/validation remains deterministic;
- no unresolved unique recovery work remains;
- branch/worktree/stash cleanup is complete;
- repository docs describe only current implementation;
- DarkFactory is source-free installable and self-hosting through its own governed df pipeline.

## 13. Stop condition

The completion run stops only for:

- success; or
- a genuine external blocker such as unavailable credentials, unavailable required recovered bytes, an external platform outage or authorization that cannot be solved from repository/local/GitHub state.

Merge conflicts, stale branches, missing implementation, red tests, architectural cleanup, agent failures and repository-local defects are work, not blockers.
