# DarkFactory — Final Master Execution Plan
## Production completion, recovered-work integration, Python-engine retirement, release, and six-repository fleet acceptance

**Repository:** `marius-patrik/DarkFactory`  
**Canonical branch audited:** `darkfactory`  
**Audited trunk SHA:** `8cf6eb310982b615a1d8cbcfe3d51a5156799fdd`  
**Plan date:** 2026-09-19  
**Parent completion Request:** #68  
**Final acceptance Request:** #361  

---

# ACTIVE EXECUTION CHECKPOINT — 2026-09-19 13:56 Europe/Prague

This checkpoint is authoritative for continuation and supersedes any older "Immediate next execution action" wording later in this document.

## Current active execution

- **#340** was released through the DarkFactory pipeline with `/df approve`.
- GitHub Actions run **35440107744** (`Autonomous Agent`) completed successfully and produced **PR #407**.
- PR #407 is open and draft on base `darkfactory`.
- PR #407's own verification reports **63 failed, 905 passed** and therefore does **not** satisfy #340 yet.
- Preview Documentation failed on the PR; Verify Bound Issue passed; CI/self-review activity was still in flight at the time of this checkpoint.
- Do **not** merge/close #340 until the full detected verification, review/fix, alignment and final gate contract is green.

## Bootstrap defect discovered while tracing #340

The current Python bootstrap runner declares stage budgets such as a 15-minute implementation budget, but the registered df harness invokes:

`df run --json --prompt-file <file>`

Current TypeScript `df run` has `--max-turns` but no elapsed-time execution-budget input. The Python runner therefore cannot pass its declared wall-clock budget into df. A model/tool execution can keep the Actions dispatch alive indefinitely.

This is now tracked by finalized Request **#406 — df run enforces bounded stage execution time so pipeline runs cannot hang indefinitely**.

### #406 sequencing

- Finish #340 first if its existing PR #407 can be repaired through the normal pipeline without another wedged execution.
- Once #340 is terminal green, execute #406 before #391.
- If #340 needs another implementation/fix dispatch and that dispatch wedges because of the same unbounded-execution defect, execute #406 as the bootstrap reliability fix before resuming #340.
- Never start conflicting parallel implementations of the same Request.

## Current tooling constraint

The connected GitHub toolset in this execution session exposes workflow reads/reruns but no authenticated workflow-run cancellation operation. This is an orchestration/tooling limitation, not permission to bypass DarkFactory implementation governance.

---


# 1. Planning is already finalized — this is not a planning phase

This master plan begins **after** planning finalization.

Before this plan was written, every currently open Request in the completion program received a canonical `darkfactory-final-planning` record on GitHub, reviewed against the current Request body, audited repository state, recovery evidence and dependency contracts, with zero remaining planning findings and an explicit owner-authorized decision:

> **APPROVED FOR MASTER-PLAN EXECUTION — implementation held until this master plan releases the Request.**

The executable `/df approve` command was intentionally **not** used during planning finalization because several Requests were already sitting at live planning gates and that command could have started implementation before the global execution order was frozen. Under this master plan, `/df approve` (or the final equivalent gate transition) is a mechanical **execution-release action**, not another planning exercise.

## 1.1 Finalized open Request set

The current open completion set is 28 Requests:

| Request | Finalized purpose |
|---|---|
| #68 | Umbrella declarable-graph + total-completion Epic |
| #248 | Reopened F14 borrowed-credential/login recovery completion |
| #251 | TUI/operator surface |
| #252 | Gemini image/video generation |
| #317 | Branch repair + structural truthfulness of mutation claims |
| #329 | Natural-stop result capture |
| #331 | Capability tiers |
| #332 | Parallel fine-grained chunks |
| #334 | TSDoc/public API coverage |
| #335 | Published Harness API + architecture docs |
| #336 | README/PRD truth + docs-impact enforcement |
| #337 | ADR/notes truth |
| #339 | Shared df hook enforcement |
| #340 | Reopened repo.df/config.df/.df hard-transition completion |
| #341 | Single TypeScript environment/quality/docs detector |
| #358 | Production graph handlers/orchestration |
| #359 | df-only production cutover / Python retirement |
| #360 | Final publish/install/release artifact |
| #361 | Six-consumer final acceptance |
| #365 | Stage-vs-subject capability inference |
| #384 | Deterministic git/rebase/conflict substrate |
| #385 | First-class Epic/Request graph |
| #386 | Stacked PRs |
| #388 | Reopened governed recovery-intake completion |
| #390 | Published dashboard/web-UI foundation |
| #391 | Reopened unified Planning/review-loop completion |
| #403 | Final supported df CLI/operator command surface |
| #406 | Bounded df-run stage execution time / cancellation reliability |

### Planning-finalization changes made before this plan

- Reopened **#340** because trunk still violates the accepted hard-transition contract.
- Reopened **#388** because PR #400 delivered only the recovery-intake helper/test foundation, not the full lifecycle/provenance/live-E2E contract.
- Reopened **#391** because PR #398 delivered graph-level Planning/Review declarations but not the full structured-context/staleness/shared-review-loop contract and introduced `.df/`-directory-style paths.
- Reopened **#248** because `recovery/f14-borrowed-refresh` contains one unique valid recovery commit not represented on current trunk.
- Filed **#403** for the missing supported CLI/operator contract (`df status`, full `df doctor`, `df work`, released install/update command integration and wrapper command parity).
- Filed and finalized **#406** after live #340 execution proved the df-backed runner has no enforced elapsed-time stage budget despite declaring one in the Python bootstrap runner.
- Superseded the bot-generated post-final legacy Interpretation on #403 so the canonical finalized Planning remains authoritative.
- No implementation PR was opened during this finalization pass.

If a Request body, accepted behavior, recovery input or dependency contract materially changes during execution, only that affected Planning artifact is invalidated and re-reviewed. Ordinary discovery of the concrete source owner behind a deliberately discovery-held plan is **not** a planning change.

---

# 2. Definition of full completion

DarkFactory is complete only when all of the following are simultaneously true:

1. Every required Request under #68 is terminal by reviewed merge or explicit rejected/superseded/duplicate disposition with rationale.
2. Every recovered September branch/worktree/ref is either integrated through the governed pipeline or explicitly dispositioned with provenance.
3. `df` is the sole production automation/mutation engine.
4. The legacy Python orchestration engine is not required or invoked by normal production operation.
5. Production GitHub mutations do not use subprocess/shell `gh`; they use the final typed df GitHub interfaces.
6. The graph executor performs the real Request lifecycle, not merely planning/shadow comparison.
7. The final runtime obeys the #340 `repo.df` / `config.df` hard-transition contract repository-wide.
8. `.df` is only a filename extension; no `.df/` directory contract remains.
9. df-managed run/review/result/audit state uses `.df` filenames in the real owning locations with no final JSON/JSONL compatibility aliases.
10. The supported CLI/TUI/operator surface is complete and coherent.
11. `df` is publishable/installable without Python, Bun-on-the-npm-path, or a DarkFactory source checkout.
12. All six intended consumer repositories are migrated to the final contract.
13. Final branch protection, required checks, workflow pins, board state and managed-file state are reconciled on all six consumers.
14. Documentation, API docs, rules, notes, ADRs, skills/assets and dashboard match the shipped product.
15. A machine-readable `audit.df` independently proves the accepted end state.
16. #361 closes green.
17. The original #68 declarable-graph acceptance criteria are rechecked against the final installed system.
18. Every production agent/stage execution has a real bounded elapsed-time contract, with #406 timeout outcomes integrated into the final graph/runtime rather than relying on Python.
19. Only then does #68 close.

A merged PR, closed issue, green unit suite or “already implemented” comment is evidence, not a substitute for the relevant acceptance criteria.

---

# 3. Audited starting state

The execution plan starts from these known facts.

## 3.1 Production is still dual-engine

Current production still contains active Python/shell mutation paths:

- project-board automation runs Python;
- quota resume runs Python;
- PR approval/merge runs Python;
- release is Python-driven;
- installation is Python-driven;
- the legacy `bin/darkfactory` front door executes Python;
- open-PR and other paths still use shell `gh`;
- `agent.yml` still contains Python event preparation and shell delegation;
- `df-dispatch.yml` is explicitly a **Shadow** workflow.

Therefore #359 is a real production migration, not a deletion cleanup.

## 3.2 Graph execution is not yet production-complete

The TypeScript executor core exists, but #358 remains necessary because production agent/automation/check/gate/action handlers and full graph-native orchestration are not yet the sole execution path.

Current persistence still includes JSON-era state/result contracts in the graph/runtime implementation.

## 3.3 #340 is currently regressed on trunk

Current tree still contains, among other evidence:

- `.darkfactory/df/config.json`;
- graph context paths such as `.df/planning-review.md`;
- graph context paths such as `.df/review-summary.md`;
- JSON/JSONL run/result persistence paths.

#340 was therefore correctly reopened and is an early hard gate.

## 3.4 The supported CLI/release surface is incomplete

Current TypeScript behavior still differs from the final product contract:

- bare `df` enters chat, not the final TUI;
- `df status` is missing;
- the final `df work` surface is missing;
- `df doctor` is narrower than final fleet diagnostics;
- released `df install`/update is not the final supported source-free path;
- wrapper recognition can drift from the actual command set;
- the npm package is still private/version `0.0.0` and points at source;
- release CI is still Python-driven.

#251, #403 and #360 now own this completion explicitly.

## 3.5 Fleet is not migrated

Five non-DarkFactory consumers still use legacy `.github/darkfactory.json`.

Two historical names now redirect and must be resolved by stable GitHub repository identity:

- historical `marius-patrik/OdbornaPrace` -> current `marius-patrik/OdbornaPrace-paper`;
- historical `marius-patrik/mono-OdbornaPrace` -> current `marius-patrik/OdbornaPrace-mono`.

Final acceptance must not rely on brittle name equality.

---

# 4. Recovery ledger frozen before execution

The 16 preserved `recovery/*` branches are all accounted for.

| Recovery branch | Final owner/disposition |
|---|---|
| `recovery/pr-376-clean` | #340 reopened completion input/provenance |
| `recovery/f48-layout` | #340 reopened completion input/provenance |
| `recovery/f28-dispatch` | #242 historical recovery; no unique valid implementation remains (see below) |
| `recovery/f14-borrowed-refresh` | #248 reopened; unique F14 commit must be governedly integrated |
| `recovery/f40-capability-tiers` | #331 |
| `recovery/f38-result-capture` | #329 after #331 |
| `recovery/f42-tsdoc` | #334 multi-source recovery |
| `recovery/f42-tsdoc-w2` | #334 multi-source recovery |
| `recovery/f42-tsdoc-w3` | #334 multi-source recovery |
| `recovery/f42-tsdoc-w4` | #334 multi-source recovery |
| `recovery/f44-readme-prd` | #336 |
| `recovery/f45-adrs` | #337 |
| `recovery/f47-hooks` | #339 |
| `recovery/f49-detected-quality` | #341 migration evidence/seed |
| `recovery/d4-docs-generator` | #335 |
| `recovery/fix-empty-agent-output` | No unique work: branch is fully behind current trunk, ahead by 0, file diff empty |

## 4.1 F28 disposition

`recovery/f28-dispatch` remains historically divergent because its original recovery commit is not an ancestor of the cleaned merged implementation. Its only current branch diff is historical test code.

The recovered test expected `checks: read`; merged #242/PR #371 intentionally changed that contract to `checks: write` for real Checks API telemetry. The dispatch pin test is byte-equivalent to current trunk, and current trunk carries newer additional workflow tests.

**Disposition:** retain F28 branch as provenance; no valid unique implementation remains to integrate. Do not reopen #242 solely for F28.

## 4.2 F14 disposition

`recovery/f14-borrowed-refresh` is one unique commit ahead of trunk:

- commit `ffe1f0f` — `fix(harness): borrowed login refresh and provider schema (F14 local recovery)`

It changes borrowed credential refresh/import behavior, credentials and provider schema/defaults.

**Disposition:** #248 is reopened and finalized specifically to import/reconcile this lane.

## 4.3 Additional recovery holds not represented by the 16 branches

Two finalized Requests still require recovery discovery:

### #251 TUI prior work
No distinct remote TUI recovery branch was found. Before implementation:
- inspect surviving Git history, archived session evidence and any still-available local/recovery material;
- if unique state survives, preserve it and import through #388;
- otherwise record an explicit searched-sources/no-unique-state disposition.

### #358 F30-4 orchestration prior work
No distinct remote F30 branch/PR was found. Before #358 implementation:
- search surviving refs/session/recovery evidence;
- preserve/import any unique state through #388;
- otherwise record a searched-sources/no-unique-state disposition.

### #365 prior rejected implementation
The surviving `feature/task-profile-inference-separates-implementation-su` branch predates this plan and belongs to the rejected #365 attempt. There is no open PR. Use it only as optional implementation evidence after comparing it against finalized #365 Planning; do not treat it as approved work.

---

# 5. Execution-release rule

Every Request already has finalized owner-authorized Planning.

When this master plan releases a Request:

1. Re-fetch the current Request body.
2. Re-fetch the finalized Planning record.
3. Confirm the dependency/recovery hold named in that Planning record is satisfied.
4. Confirm no material Request/behavior change has occurred.
5. Resolve the current canonical base SHA/default branch.
6. Confirm the exact recovery SHA(s), if applicable.
7. If only discovery-held implementation ownership has become concrete, proceed without rewriting Planning.
8. If behavior/scope materially changed, re-review only that Request.
9. Issue the pipeline's actual gate-release transition (`/df approve` or the shipped equivalent) only then.
10. Implementation, verification, review/fix, alignment and merge remain pipeline-governed.

No global re-planning phase exists in this master plan.

---

# 6. PHASE 1 — Repair the foundations used by every later lane

## 1A. #340 — finish the hard naming/state transition

**Release first.**

Eliminate repository-wide regressions before other final-state work relies on them:

- remove `.darkfactory/df/config.json` as a supported/current contract;
- remove `.df/` directory semantics;
- remove legacy manifest/config resolver reads;
- converge df-owned persistence to `.df` filenames in real owning locations;
- ensure root-vs-`.darkfactory` resolution is consistent across runtime, installer, docs and workflows;
- both root and `.darkfactory` versions of the same logical config are an error;
- do not mechanically rename unrelated user data.

**Exit:** repository-wide tests/search prove the final resolver/state rules.

## 1B. #406 — bounded df-run execution time

Execute immediately after #340 under the normal path. If a subsequent #340 repair dispatch demonstrably wedges on the same defect, #406 becomes the bootstrap unblocker before resuming #340.

Required:

- one total elapsed-time budget for a logical `df run` / pipeline stage;
- provider/model failover and tools consume the same deadline rather than resetting it;
- timeout is typed and never reported as successful/natural completion;
- persisted deterministic effects/provenance survive cancellation;
- resources/locks/session state clean up or recover deterministically;
- timeout is distinguishable from quota, auth, model failure and owner cancellation;
- `--max-turns` remains a separate safety bound;
- the bootstrap Python runner passes its existing Planning/Review/Implementation budgets into df until #359 removes that runner;
- #391/#358 later consume the same df-native timeout outcome rather than inventing another timer.

**Exit:** a df-backed Actions implementation dispatch cannot remain unbounded solely because the agent never stops.

## 1C. #391 — complete the unified Planning/review infrastructure

Run immediately after #340.

PR #398's graph declaration is the starting point, not the full acceptance.

Finish:

- durable structured Planning context packet;
- context provenance/versioning;
- Request/base/dependency/recovery staleness invalidation;
- shared generic review-loop engine used by Planning and implementation review where semantics match;
- structured durable findings;
- fix dispatch;
- iteration accounting;
- persistence/resume;
- quota/provider recovery;
- no duplicate review effects;
- one owner Planning gate;
- final alignment against approved Planning + amendments;
- #340-compliant review/planning state filenames;
- live Planning-review E2E.

**Exit:** remaining implementation can execute through the actual final lifecycle that was already semantically finalized on GitHub.

## 1D. #388 — complete the early intake/provenance substrate enough for recovery waves

#388 stays open until its full later integration is proven, but its early intake capability must become production-usable now.

Complete/prove at least:

- exact clean/dirty/untracked snapshot provenance;
- target Request binding;
- no silent recovered-byte mutation;
- secret-bearing material blocked/preserved;
- durable recovery identity/state;
- post-#391 Planning context receives recovery provenance;
- imported implementation cannot jump directly to PR/merge;
- no stale Planning approval reuse.

This early milestone is what subsequent recovery-heavy Requests use.

**Do not close #388 yet.**

---

# 7. PHASE 2 — Intake all preserved recovery sources before regenerating implementation

Once Phase 1's intake path is usable, import/preserve every active recovery source through #388.

## Immediate governed intake

- F14 -> #248
- F40 -> #331
- F42 / W2 / W3 / W4 -> #334
- F44 -> #336
- F45 -> #337
- F47 -> #339
- F49 -> #341
- D4 -> #335
- PR376/F48 -> #340 provenance/backcheck

## Held intake

- F38 -> #329 **only after #331 merges**, per finalized #329 Planning.
- #251 TUI source -> import only after the discovery step finds unique material.
- #358 F30-4 -> import only after discovery and #331/#329 prerequisites.
- #365 old feature branch -> optional evidence only; not automatically imported as approved implementation.

For every intake, record:

- original source/ref/HEAD/snapshot;
- recovery branch/SHA;
- current canonical base;
- target Request(s);
- finalized Planning identity/version;
- imported-state hash;
- secret scan result;
- overlap with other lanes;
- reconciliation result.

---

# 8. PHASE 3 — Bootstrap routing and provider correctness

This phase can run partly in parallel with later recovery imports.

## 3A. #365 — fix stage-vs-subject task inference

Finish first.

Required behavior:

- implementation/planning/review/fix/docs/tests **about** specialized image/video capabilities remain ordinary engineering work;
- genuine direct artifact-generation remains specialized;
- direct artifact intent outranks generic `create`/`implement` ambiguity;
- an optional cheap classifier cannot erase explicit artifact intent;
- sensitivity/secret inference is unchanged;
- diagnostics explain capability inference and candidate acceptance/skips.

**Exit:** #252 can be planned/executed by normal coding models.

## 3B. #252 — Gemini image/video generation

After #365:

- use live provider catalog and current account model;
- no hard-coded routing catalog;
- declare capabilities correctly;
- generation only when the task/config requires it;
- per-account quota/limit/failover integration;
- persisted run state survives failover;
- engineering work about generation providers remains engineering.

This lane may proceed in parallel with the core engine chain after #365.

## 3C. #248 — integrate F14 borrowed credential refresh

After F14 #388 intake:

- compare exact recovered behavior with current account/provider schema;
- preserve valid borrowed-refresh/import fixes;
- keep borrowed-source non-mutation guarantee;
- preserve multi-account slots;
- preserve credential security/locality;
- adapt only stale interfaces.

Close #248 only after the unique F14 delta has a terminal governed disposition.

---

# 9. PHASE 4 — Core router -> result -> executor chain

This is the primary engine critical path.

## 4A. #331 — capability tiers

Input: exact F40 recovery.

Finish only the current delta after recovery/current-tree reconciliation:

- ordered/configured capability tiers;
- difficulty -> minimum tier;
- eligibility before tier preference;
- lowest sufficient eligible tier;
- exactly one-tier escalation after failure;
- reset escalation on success;
- graph min-tier support;
- required `df run --difficulty` / `--min-tier` behavior;
- route/diagnostic visibility.

Merge green.

## 4B. #329 — natural-stop result capture

Only after #331 is merged green.

Import exact F38 through #388, then finish:

- no mandatory task submit tool;
- no mandatory task JSON final answer;
- natural model stop is normal completion;
- code truth from engine-observed diff/files/scope/verification/commit evidence;
- judgement prose extracted by ordinary routed structured-output call;
- sensitivity + data collection + capability tier + structured-output capability + account/quota + validation + retry/failover all enforced;
- explicit offline `df run --capture-schema`.

Merge green.

## 4C. #358 — production graph handlers/orchestration

Only after #331 + #329 and F30-4 discovery/disposition.

Finish:

- real agent handlers;
- real automation handlers;
- real check-reference behavior;
- real gate/comment/hint effects;
- exactly-once external-event resume;
- #230 gate grammar/authorization reuse;
- deterministic workspace/GitHub operations through shipped owners;
- one routed df run per implementation-review iteration;
- fix then new review iteration until clean;
- lighter scope-amendment gate;
- final alignment;
- external static CI checks observed rather than reimplemented;
- final #340 persistence.

This is the point where `runGraph` becomes the real orchestration engine rather than a tested core.

## 4D. #332 — parallel fine-grained chunks

After #358 + #329:

- smallest independently-verifiable chunks;
- explicit scope/ownership/dependency metadata;
- safe parallelism validation;
- isolated engine worktrees;
- #331 routing;
- #329 results;
- engine-created verified commits;
- ordered merge-back;
- sibling failure isolation;
- persisted resume;
- conflict work routed through graph-native conflict handling.

---

# 10. PHASE 5 — One detected quality contract + recovered docs/governance

This lane can run in parallel with the latter part of Phase 4 where dependencies allow.

## 5A. #341 — one TypeScript detector

After #340 and F49 intake.

Produce one normalized detection result used by:

- `df doctor`;
- generated CI jobs/matrices;
- required-check/protection synchronization;
- engine verification;
- docs extraction/build.

It resolves:

- test;
- lint;
- format_check;
- docs_check;
- docs_extract;

or explicitly reports unsupported/missing behavior.

F49's Python implementation is migration evidence only.

## 5B. #334 — TSDoc

After F42 multi-source intake and #341 contract:

- reconcile all recovered TSDoc with current exports;
- document all intended public df/harness exports;
- strict TypeDoc/TSDoc checks;
- zero warnings;
- one generated API source for #335.

## 5C. #339 — one df hook engine

After F47 intake; consume #341.

Finish:

- one registry/runner;
- validated `enforced_by` rule IDs;
- same implementations local + CI;
- tests-touched;
- conventional commit;
- branch naming;
- PR/Request binding;
- secret scan;
- formatting;
- English/docs;
- TSDoc/docs;
- mutation trigger integration;
- `df hooks run`;
- rule/AGENTS projection.

No second hook runner.

## 5D. #335 — published API + architecture docs

After #334 + #341 and D4 intake:

- reconcile recovered D4 docs generator;
- use the same package detector;
- use the same generated API source;
- deterministic navigation;
- zero-warning ProperDocs build;
- architecture docs describe the actual shipped runtime.

---

# 11. PHASE 6 — Deterministic git, truthful branch repair, Request graph, stacks

## 6A. #384 — deterministic common git substrate

Primitive work may reuse #328 earlier, but close only after #358 persistence and #339 hooks integrate.

Required:

- status/diff/log/fetch;
- branch create/switch;
- rebase;
- merge;
- cherry-pick;
- continue/abort;
- structured conflict state;
- durable resume;
- dirty-worktree protection;
- explicit destructive intent;
- lease-safe expected-old-SHA updates;
- stale lease fail-closed;
- no blind force;
- operator diagnostics.

## 6B. #317 — branch update/repair + structural write-claim truth

Use #384 + #358 + #341 + #339.

Required:

- dynamic actual base branch;
- deterministic update first;
- model conflict repair only when required;
- same detected verification contract;
- deterministic commit/push;
- graph re-entry to merge path;
- false mutation claims rejected based on actual effect evidence, never keyword matching.

## 6C. #385 — Epic / Request graph

After #358 defines the actual reconciliation/state owner.

Required:

- exactly one Epic parent or none;
- ordered/unordered children;
- separate epic/child, blocks, blocked_by, related semantics;
- no cycles/orphans/ambiguous parentage;
- explicit independent or approved shared Planning coverage for multi-Request PRs;
- deterministic GitHub/project/board reconciliation;
- terminal state derived from child terminal states + explicit dispositions.

## 6D. #386 — stacked PRs

Hard dependencies:

- #384
- #358
- #385

Integrate:

- #317 repair/conflict path;
- #339 hooks.

Required:

- explicit stack topology;
- explicit Request bindings;
- dependency-aware merge order;
- deterministic restack/retarget;
- actual git conflicts use #358 resumability;
- lease-safe rewritten updates;
- direct vs cumulative diff semantics;
- focused child review does not reattribute inherited parent code;
- GitHub approval invalidation detected/re-gated rather than fabricated;
- topology validation;
- machine-readable audit.

---

# 12. PHASE 7 — Finish #388 as a full governed recovery product

After #384/#358/#339/#385/#386 are available, close the deeper #388 contract.

Prove:

- overlapping lanes;
- multiple Request bindings;
- shared Planning where explicitly approved;
- stack-aware imports;
- deterministic conflict/rebase continuation;
- quota/provider interruption/resume;
- stale remote lease refusal;
- no duplicated effects;
- scope-amendment gate;
- final alignment;
- complete final provenance;
- cleanup eligibility only when unique local work is safely represented/terminal.

## Required live recovery E2E

Use one real preserved DarkFactory recovery lane.

It must travel through:

recovery provenance  
-> Request binding  
-> post-#391 unified Planning context  
-> Planning review clean  
-> execution release  
-> imported implementation reconciliation  
-> deterministic verification  
-> implementation review  
-> fix  
-> new review iteration  
-> scope amendment gate if required  
-> final alignment  
-> checks/review/merge  
-> terminal provenance.

Do not close #388 without this.

---

# 13. PHASE 8 — Production cutover: #359

This phase retires the old engine **after** the df engine is actually complete.

Hard prerequisites:

- #340 green;
- #391 green;
- #331 green;
- #329 green;
- #358 green;
- #332 green;
- #341 green;
- #339 green;
- #384 green;
- #317 green;
- #385 green;
- #386 green;
- #388 full recovery path green.

## 8A. Build a then-current production mutation ledger

Do not rely on today's filenames when executing this phase.

Inventory every production mutation path that exists at cutover time:

- Request intake;
- issue comments;
- Planning comments/review/gate;
- agent dispatch;
- implementation dispatch;
- PR create/update;
- branch repair;
- implementation review/fix;
- check waiting;
- merge;
- issue closure;
- board/project reconciliation;
- quota checkpoint/resume;
- failure reporting;
- repository settings/protection;
- workflow installation/update;
- install/update;
- release/tag/release-object mutation where still coupled.

For each path record:

| Field | Required |
|---|---|
| Trigger/event | yes |
| Legacy owner | yes |
| Permissions | yes |
| Side effects | yes |
| Final df owner | yes |
| Unit/integration proof | yes |
| Live proof | yes |
| Deletion/retention reason | yes |

## 8B. Activate df as the sole mutating dispatcher

- end shadow-only production;
- execute the declared graph through production handlers;
- preserve static CI/check jobs outside runtime graph only where architecture explicitly requires;
- reconcile required checks and protection to the generated/detected final contract.

## 8C. Retire Python orchestration

Delete/disable only after replacement proof.

Any Python retained after #359 must be explicitly:

- non-mutating;
- not an alternate approval/agent/board/resume/merge engine;
- not required for normal production df operation;
- documented with a reason.

## 8D. Retire shell/subprocess GitHub mutation

Production GitHub mutation uses final typed df interfaces.

No production subprocess `gh` or shell mutation path remains.

## 8E. Live df-only E2E

Run the actual GitHub lifecycle:

Request  
-> unified Planning context  
-> Planning review/fix clean  
-> execution release  
-> implementation  
-> deterministic verification  
-> implementation review/fix iterations  
-> lighter scope-amendment approval if triggered  
-> final alignment  
-> checks  
-> final review/merge gate  
-> merge  
-> issue/board/run-state reconciliation.

Also prove an interruption/quota-resume or equivalent persisted recovery path.

Only then close #359.

---

# 14. PHASE 9 — Finish the operator product surfaces

After #359, the final APIs/state are stable enough to finish user-facing surfaces without chasing transition internals.

## 9A. #251 — TUI

First resolve the TUI recovery hold.

Then implement:

- bare interactive `df` -> TUI;
- DarkFactory commands remain DarkFactory;
- non-DarkFactory flags/paths/nonmatching invocations -> system `df(1)`;
- CI/provider/quota panes use final APIs;
- dynamic model picker;
- no hard-coded provider/model catalog;
- one command registry shared with #403;
- final asset requirements discovered from actual implementation.

## 9B. #403 — complete CLI/operator command contract

After stable #340/#341/#358/#359 interfaces:

- `df status`;
- full `df doctor`;
- `df work`;
- final install/update operator entry points;
- complete headless help/dispatch;
- wrapper command parity;
- one command source of truth shared with TUI.

#360 later proves the packaged version of this surface.

## 9C. #390 — dashboard/web UI foundation

After #251 + #335 + #341 + #359.

Complete **before the final #360 release** so the release is truly final.

Required:

- reusable df dashboard/application shell;
- ProperDocs first-class docs route;
- canonical quota/account/provider semantics;
- no duplicate quota engine/catalog;
- no secrets in public/static assets;
- explicit unknown/disconnected states;
- authenticated/local/runtime data boundary if private live data cannot safely be public;
- future navigation/extension points;
- responsive UI;
- zero-warning docs integration;
- df-native deploy path.

---

# 15. PHASE 10 — Late documentation/governance truth pass

Do this only after the architecture/product surfaces above are materially final.

## 10A. #336 — README/PRD + docs-impact

F44 was already imported earlier.

Now:

- port recovered docs-impact semantics into actual #339/#341 hook/diff/CI owners;
- actual PR base, never hard-coded `main`;
- inability to compute diff fails closed;
- valid empty diff is valid;
- `Docs: none (<reason>)` only when allowed;
- rewrite/fact-check README + PRD against **shipped reality**, not intended future state.

## 10B. #337 — ADRs/notes

F45 was already imported earlier.

Now:

- reconcile `.agents/notes/` and `.agents/notes/adr/`;
- preserve historical decisions;
- explicitly mark superseded decisions;
- update/mark stale bootstrap material;
- every new normative statement traces to recorded owner decision/context/consequence;
- final governance checks catch contradictions.

---

# 16. PHASE 11 — Final release/install artifact: #360

Only now build the final supported distribution.

## Required distribution contract

- one canonical real SemVer authority;
- publishable package;
- npm path runs built Node-compatible JavaScript without Bun/source checkout;
- native targets declared only where CI can build **and execute** them on compatible native runners;
- native smoke test for every declared target;
- runtime assets include every final graph/schema/workflow/skill/TUI/dashboard/native/data asset actually required;
- portable verified checksums;
- source commit provenance;
- initial installation requires neither Python nor preinstalled df;
- update is supported;
- POSIX system-df coexistence tested;
- Windows direct executable tested;
- old Python CLI/front door is not supported.

## Clean-directory smoke

At minimum:

- `df --version`
- `df status`
- `df doctor`
- `df route`
- `df ci status`
- offline-capable `df run`
- `df work`
- final install/update path
- TUI launch on a compatible TTY
- packaged dashboard/docs assets where applicable.

Release process itself is df-native after #359.

---

# 17. PHASE 12 — Migrate the five legacy consumers

Use the **released artifact**, not source-tree scripts.

## Fleet identities

Resolve by stable repository ID and record current canonical names:

1. `DarkFactory`
2. `omnis`
3. `ChessWithQuests`
4. `OdbornaPrace-paper` (historical `OdbornaPrace`)
5. `template-OdbornaPrace`
6. `OdbornaPrace-mono` (historical `mono-OdbornaPrace`)

DarkFactory is already on the new repo/config naming foundation but must still pass final installation/drift checks.

The five non-DarkFactory consumers currently retain legacy `.github/darkfactory.json` and require actual migration.

## Per-consumer migration

Use final `df` install/update to reconcile:

- `repo.df`;
- `config.df` if needed;
- generated/managed workflow callers;
- exact release/source pin;
- rules;
- skills/assets;
- branch protection;
- required checks;
- board/governance state;
- detected package/quality contract;
- docs/deploy behavior.

No manual copy-based migration counts as final evidence.

Run install/update twice to prove idempotency.

---

# 18. PHASE 13 — Final fleet acceptance: #361

#361 is verification of the finished product, not implementation of missing behavior.

## 13A. Terminal-work audit

Prove:

- every #68 child/gap Request is terminal;
- every recovery branch/hold is integrated or explicitly dispositioned;
- no unexplained local-only implementation remains;
- no unexplained open implementation PR remains.

## 13B. Six-repository doctor/drift audit

For each consumer record:

- stable repository ID;
- current canonical name;
- SHA;
- default branch;
- df release version/source commit;
- repo/config resolution;
- managed-file drift;
- workflow pins;
- branch protection;
- required checks;
- detected test/lint/format/docs actions;
- credential/provider/account diagnostics without exposing secrets;
- board reconciliation;
- Request/Epic graph;
- stack graph;
- docs/build state;
- install/update idempotency.

## 13C. Governance graph audit

### #385
- unambiguous Epic parentage;
- no cycles/orphans;
- relationship types correct;
- explicit multi-Request/shared-Planning coverage;
- no duplicate/unrelated completion.

### #386
- topology/base refs reconcile;
- Request bindings present;
- no cycles/missing parent/stale descendants/ambiguous ownership;
- merge order correct;
- retarget/restack evidence correct;
- direct/cumulative diff evidence correct.

## 13D. Git/resume audit

Prove #384 behavior where exercised:

- persisted true conflicts;- continue/abort;
- interruption/resume;
- lease-safe updates;
- stale lease refusal.

## 13E. Released-df-only E2E

Run the normal lifecycle with the **released artifact**, not harness source.

Also prove a persisted interruption/resume case.

## 13F. Dashboard/docs/rules truth audit

Verify:

- #390 dashboard live;
- ProperDocs route live;
- quota view safe;
- generated Harness API docs live;
- architecture docs true;
- README/PRD true;
- `.agents/rules/` true;
- `.agents/notes/` true;
- `.agents/notes/adr/` true;
- bundled skills/assets present;
- no credential leakage.

## 13G. Produce `audit.df`

`audit.df` must be machine-readable and include:

- df version;
- source commit;
- all six stable repository IDs;
- current names;
- SHAs/default branches;
- repo/config resolution evidence;
- schema/state naming evidence;
- doctor results;
- managed drift;
- workflow pins;
- branch protection;
- required checks;
- detected verification actions;
- board audit;
- Request/Epic audit;
- stack audit;
- git/conflict/resume evidence;
- complete recovery ledger + dispositions;
- #388 live-import provenance;
- final Planning identities/approvals;
- implementation review/fix/alignment evidence;
- #359 zero-legacy-production-dependency proof;
- release/platform smoke;
- dashboard/docs/rules/API/skills evidence;
- released-df-only E2E/resume;
- remaining Request/PR audit.

Close #361 only when the audit is internally consistent and all criteria are green.

---

# 19. PHASE 14 — Close #68

Only after #361 is closed green.

Re-run the **original** #68 graph contract against the final installed product:

- one authoritative node/edge workflow declaration;
- consumer node changes do not require hand-editing duplicated YAML;
- validation rejects cycles/unknown nodes/unreachable required checks;
- generated/managed workflow rendering is deterministic;
- regenerated workflow diff is clean;
- final architecture's intentionally-static external CI/check jobs are represented consistently with the declared graph/check-reference design and are not drifting hand-maintained copies.

Then verify:

- no open required child;
- no unexplained recovery branch;
- no unexplained implementation PR;
- no legacy alternate production engine;
- #361 closed green.

Only then close #68.

---

# 20. Critical dependency graph

```text
PLANNING FINALIZATION
(already completed before this document)
        |
        v
#340 hard transition
        |
        v
#406 bounded df-run execution
        |
        +---------------------> #341 detector --------------------+
        |                                                        |
        v                                                        +--> #334 -> #335 --+
#391 completed Planning/review infrastructure                    |                 |
        |                                                        +--> #339 --------+---+
        v                                                                          |   |
#388 early intake/provenance                                                        |   |
        |                                                                          |   |
        +--> F14 -> #248                                                           |   |
        +--> F40 -> #331 -> F38 -> #329 -> #358 -> #332                          |   |
        +--> F42x4 ---------------------------> #334                               |   |
        +--> F47 -----------------------------> #339                               |   |
        +--> F49 -----------------------------> #341                               |   |
        +--> D4 ------------------------------> #335                               |   |
        +--> F44/F45 held for late truth pass                                      |   |
                                           |                                       |   |
#365 -> #252                              v                                       |   |
                                      #384 git ------------------------------------+   |
                                           |                                           |
                                           +--> #317                                    |
                                           +--> #385 -> #386 <-------------------------+
                                                       |
                                                       v
                                              #388 full completion
                                                       |
                                                       v
                                                    #359
                                                       |
                                  +--------------------+-------------------+
                                  |                    |                   |
                                #251                 #403                #390
                                  |                    |                   |
                                  +--------------------+-------------------+
                                                       |
                                               #336 + #337 late truth
                                                       |
                                                       v
                                                    #360
                                                       |
                                               fleet migration
                                                       |
                                                       v
                                                    #361
                                                       |
                                                       v
                                                     #68
```

Parallel work is allowed only where these dependency edges and the finalized Request-specific holds permit it.

---

# 21. Recommended execution waves

## Wave A — foundations
1. #340
2. #406
3. #391
4. #388 early intake milestone

## Wave B — recover + bootstrap
5. Intake F14/F40/F42/F44/F45/F47/F49/D4
6. #365
7. #248
8. #331
9. #341

## Wave C — core runtime
10. #329
11. #358
12. #332
13. #334
14. #339
15. #335

## Wave D — deterministic delivery/governance
16. #384
17. #317
18. #385
19. #386
20. #388 full completion

## Wave E — cutover
21. #359

## Wave F — user-facing final product
22. #251
23. #403
24. #252 if not already completed in parallel
25. #390
26. #336
27. #337

## Wave G — distribution/fleet
28. #360
29. five-consumer migration
30. #361
31. #68

The numbering is execution order, not Request priority. Independent lanes may run concurrently where dependency-safe.

---

# 22. Production cutover ledger template

Maintain this table under #359 and expand it from the **then-current** tree:

| Mutation | Legacy producer | Final df producer | Unit proof | Live proof | Removed/retained |
|---|---|---|---|---|---|
| Request intake | pending inventory | graph handler | pending | pending | pending |
| Planning comments/review | pending inventory | unified review loop | pending | pending | pending |
| Agent execution | pending inventory | production graph handler | pending | pending | pending |
| PR creation/update | shell/Python mix | typed df GitHub/workspace | pending | pending | pending |
| Branch repair | incomplete | #317/#384 graph path | pending | pending | pending |
| Implementation review/fix | transition logic | shared review loop | pending | pending | pending |
| Board/project sync | Python today | df governance handler | pending | pending | pending |
| Quota resume | Python today | df persisted resume | pending | pending | pending |
| Merge/closure | Python today | df gates/merge handler | pending | pending | pending |
| Failure reporting | legacy workflow/script | graph-native path | pending | pending | pending |
| Repo settings/protection | legacy automation | df CI/governance | pending | pending | pending |
| Install/update | Python today | released df | pending | pending | pending |
| Release/tag | Python today | df-native release | pending | pending | pending |

No legacy mutation path is removed until its row has replacement proof.

---

# 23. What the execution must never reintroduce

- `.darkfactory/manifest.json`
- `.github/darkfactory.json` as the final consumer contract
- `.darkfactory/df/config.json`
- `.df/` directories
- hard-coded `main`
- a second provider/model catalog
- a second git engine
- a second hook engine
- a second Request/Epic state model
- a second stack state model
- a second Planning review engine
- keyword-based mutation-truth validation
- mandatory task-level submit/JSON completion
- subprocess/shell `gh` production mutations
- Python as the production orchestration engine
- source-tree-only installation
- fixed historical test counts as acceptance
- historical repository names as stable identity
- manual consumer file copying as final installation proof
- manual local recovery merging outside the governed pipeline
- assuming a closed issue or merged PR proves every acceptance criterion.

---

# 24. Per-Request release checklist

Before releasing any finalized Request into implementation:

- [ ] Current Request body unchanged materially from finalized Planning.
- [ ] Final Planning record present.
- [ ] Required dependency Requests terminal as specified.
- [ ] Recovery source imported/dispositioned as specified.
- [ ] Current base/default branch resolved dynamically.
- [ ] #340 naming contract valid.
- [ ] No new architecture decision contradicts the finalized behavioral contract.
- [ ] Concrete implementation owners discovered from current tree if the plan was discovery-held.
- [ ] No guessed source owner has been promoted into scope.
- [ ] Execution-release gate posted.
- [ ] Implementation runs through pipeline.
- [ ] Detected verification green.
- [ ] Implementation review/fix converged.
- [ ] Scope amendments explicitly approved if triggered.
- [ ] Final alignment green.
- [ ] Required checks green.
- [ ] PR merged through governed gate.
- [ ] Recovery/provenance/board/run state updated.
- [ ] Request closes only when all its criteria are actually satisfied.

---

# 25. Final go/no-go

DarkFactory is ready to declare complete only if every answer is **YES**:

- [ ] Are all finalized Planning records still valid or explicitly re-reviewed after material change?
- [ ] Is every open child terminal?
- [ ] Is every recovery source integrated or explicitly dispositioned?
- [ ] Did at least one real recovery lane pass through full #388 governance?
- [ ] Is #340 clean repository-wide?
- [ ] Is every df-backed stage execution bounded by the #406 elapsed-time contract?
- [ ] Is #391's real structured Planning/review lifecycle complete?
- [ ] Does the graph execute production handlers?
- [ ] Does df perform implementation, review/fix, alignment, checks, merge, boards and resume?
- [ ] Is `df-dispatch` the sole mutating production dispatcher?
- [ ] Is Python orchestration retired from production?
- [ ] Are shell/subprocess GitHub mutations gone?
- [ ] Are deterministic git/rebase/conflict/resume semantics production-proven?
- [ ] Are Epic/Request and stack graphs valid?
- [ ] Is the complete operator CLI/TUI surface available?
- [ ] Is the dashboard live and safe?
- [ ] Is the package publishable and Node-compatible?
- [ ] Are every declared native target's binaries executed in CI?
- [ ] Can a clean machine install/update df without Python/source checkout?
- [ ] Are all six consumers on final repo.df/config.df contracts?
- [ ] Are workflow pins, protection, required checks and boards correct on all six?
- [ ] Do README/PRD/ADRs/notes/rules/API docs describe the shipped system?
- [ ] Is `audit.df` complete and self-consistent?
- [ ] Did released-df-only E2E and resume tests pass?
- [ ] Is #361 closed green?
- [ ] Do the original #68 declarable-graph criteria still pass?
- [ ] Only then: is #68 closed?

---

# 26. Immediate continuation action

1. Continue #340 through PR #407's pipeline review/fix/verification/alignment lifecycle.
2. Do not merge #407 while its verification is red or documentation/required checks fail.
3. If #407's repair loop converges, merge/close #340 and execute #406.
4. If a #340 repair dispatch wedges due to the discovered missing elapsed-time bound, execute #406 first, then resume #340.
5. After both #340 and #406 are terminal green, release #391.
6. Continue the dependency waves from there.

No manual product implementation is authorized as a workaround.
