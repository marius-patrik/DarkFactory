# DarkFactory — Canonical Optimized Completion Plan

## Purpose

This is the single cross-Request execution plan for completing DarkFactory.

It defines:

- the final product and architecture;
- the optimized dependency model;
- recovery-work ownership and reconciliation;
- the earliest safe self-hosting cutover;
- package/capability, docs, web, auth and release convergence;
- fleet migration and final acceptance.

It deliberately does **not** store workflow run IDs, transient PR heads, current step names or checkpoint diaries. GitHub issues, PRs and Actions are the source of live execution status.

**Canonical branch:** `darkfactory`  
**Parent completion Epic:** #68  
**Final fleet acceptance:** #361

---

## 1. Source-of-truth hierarchy

When sources differ, use this order:

1. Current owner-approved product requirements in `PRD.md`.
2. Current Request body and explicit acceptance criteria.
3. Accepted ADRs under `.agents/notes/adr/`.
4. Latest owner-finalized Planning for the affected Request.
5. This file for cross-Request sequencing, optimization, recovery ownership and final gates.
6. GitHub issue/PR/Actions state for live execution status.

Material product/architecture changes update PRD/ADR/Request state before implementation. Concrete current-tree ownership discovered during implementation does not invalidate Planning unless behavior or architecture changes.

---

## 2. Optimization rules

The program was previously over-serialized. The following rules are now explicit.

### 2.1 Start-work dependencies are not merge dependencies

A Request may begin analysis, recovery reconciliation, implementation or testing before every downstream interface is merged when:

- its behavioral contract is settled;
- its work can be isolated on a branch/worktree;
- unresolved interfaces are named rather than guessed;
- final merge waits for the interfaces it actually consumes.

Only mutable-base conflicts or real interface uncertainty justify idle waiting.

### 2.2 Merge dependencies are not final-acceptance dependencies

A feature does not need every future product surface to exist before it can merge. Final fleet/release acceptance may require capabilities that are not prerequisites for an earlier core cutover.

### 2.3 Recovery work is implementation, not archaeology

The preserved September branches are already durable. They may be inspected, rebased, decomposed and reconciled immediately. Full productized #388 recovery is **not** a prerequisite for consuming already-preserved recovery branches.

Recovered work is the starting implementation where still valid. Do not regenerate finished work from clean trunk merely because its old source path changed.

### 2.4 Integrate recovered work into final homes

The package/capability foundation lands before bulk recovery merge. Recovered TypeScript work is adapted directly into final packages/capabilities instead of first being merged into the monolithic `harness/` tree and migrated again.

### 2.5 Self-host early

The main acceleration target is #359. DarkFactory should become the production engine as soon as the **core Request lifecycle** is reliable. Features such as final docs/web polish, stacked PRs, full recovery productization, TUI, Epic UX and final release polish should then be completed through the real df-native pipeline.

### 2.6 Temporary bootstrap-authoring exception

Until #359 is complete, a narrowly-scoped direct patch may be authored when the current pipeline defect prevents the pipeline from correctly implementing its own bootstrap repair.

This exception:

- applies only to bootstrap/architecture convergence required to make df self-hosting;
- never skips a Request, Planning, tests, independent review, owner approval or PR/check/merge gate;
- never permits bypassing recovery provenance;
- must not become a normal implementation path;
- expires permanently when #359 closes.

---

## 3. Final architecture

### 3.1 Bun workspace

DarkFactory becomes a root Bun workspace with these first-party packages:

- `@darkfactory/protocol` — browser/runtime-safe schemas, serialized contracts and cross-surface types;
- `@darkfactory/core` — execution kernel, graph/run state, provider/router machinery, config resolution and capability loading;
- `@darkfactory/capability` — capability ABI, loader and deterministic adapter/build tooling;
- `@darkfactory/github` — typed GitHub REST/GraphQL substrate with browser/server-safe entrypoints;
- `@darkfactory/keychain` — all machine/harness credential custody and authentication;
- `@darkfactory/auth` — human/browser GitHub App authentication and web sessions;
- `@darkfactory/docs` — headless documentation compiler/content graph;
- `@darkfactory/cli` — `df` executable, command composition and TUI ownership;
- `@darkfactory/web` — the only first-party web renderer/application.

The old `@darkfactory/harness` may exist only as a temporary migration shim and is removed before final release.

### 3.2 Core mechanisms versus capabilities

Core owns mechanisms. Agentic/product behavior lives in first-class versioned capabilities under root `capabilities/`.

Initial capability set includes at least:

- code;
- paper;
- math;
- docs;
- git;
- github;
- planning;
- review;
- ci;
- release;
- recovery;
- hooks;
- epics;
- stacks.

Each capability uses one canonical TypeScript definition and may contribute detection/setup, tools, commands, graph behavior, deterministic actions, verification, hooks, docs, web surfaces, release outputs and audit metadata.

Supported integration artifacts are generated from that canonical definition, including native DarkFactory, Pi ExtensionAPI, standalone MCP server and supported Claude/Codex/agent skill/plugin forms. No independent handwritten implementation per harness.

### 3.3 Domains remain separate from capabilities

The existing semantic model remains:

`ecosystem -> package -> domain`

with first-class multi-domain repositories.

Initial semantic domains include `code`, `paper` and `math`. Capabilities are orthogonal; for example `docs`, `git` or `review` may apply across multiple domains.

### 3.4 Configuration

- `repo.df`: repository/product declaration and final #340 repository contract.
- `config.df`: runtime/user/provider configuration and final #340 runtime contract.
- `docs.df`: native DarkFactory documentation configuration.
- `properdocs.yml` and `mkdocs.yml`: accepted compatibility inputs to the docs compiler, not final runtime dependencies.

A `.df` suffix is a file extension, never a directory convention.

### 3.5 Credentials and authentication

`@darkfactory/keychain` is the only machine/harness credential owner. It covers secure storage, encrypted fallback, environment/import sources, provider OAuth/API keys, refresh/rotation, multi-account slots, borrowed CLI credentials, GitHub App private-key/JWT/installation-token flows, CLI-side user credentials, redaction, secret scanning and credential diagnostics.

Capabilities declare credential requirements and receive scoped handles; they do not read raw credential files, environment variables or OS keychains directly.

`@darkfactory/auth` separately owns human/browser GitHub App login, PKCE/state, confidential exchange/refresh broker integration, session restoration and logout/revocation. Browser artifacts cannot import keychain/private-key code.

### 3.6 Documentation and README

`@darkfactory/docs` replaces ProperDocs/MkDocs as the execution engine and produces one typed content graph from canonical prose, ADRs/rules, real TypeScript/TSDoc API extraction, capability docs, repository/graph/workflow metadata and other supported package extractors.

TypeDoc may remain an internal TypeScript extractor.

The same semantic homepage source renders:

- the docs home page; and
- committed `README.md` Markdown.

CI fails on deterministic README projection drift.

### 3.7 Web UI

`@darkfactory/web` is one prebuilt React/TypeScript application released by DarkFactory and reused unchanged by every consumer.

Preferred UI stack:

- React + TypeScript;
- shadcn/ui;
- lucide-animated;
- Motion;
- Dagre;
- Wouter;
- Dockview only where a docking/workspace surface materially benefits from it.

Consumers compile repository-specific content/data only; they do not rebuild the React application.

The app is hosted on GitHub Pages and remains dynamic by reading live GitHub REST/GraphQL state through browser-safe GitHub/auth packages.

DarkFactory Web is the primary day-to-day operator UI. GitHub remains the durable control plane, authorization authority and event bus; normal DarkFactory operation should not require using the github.com UI except where GitHub itself requires a consent/review surface.

A minimal auth broker performs confidential GitHub App user-token exchange/refresh only. It is not a DarkFactory backend, state store or execution API.

---

## 4. Final product invariants

DarkFactory is complete only when all of these are true:

1. `df` is the sole production orchestration/mutation engine.
2. Normal production does not require legacy Python orchestration.
3. Production GitHub mutations use typed df-owned GitHub interfaces; shell/subprocess `gh` mutation is gone.
4. The graph runs the real Request lifecycle with durable interruption/resume.
5. The final #340 `repo.df`/`config.df`/`.df` hard transition is repository-wide.
6. The package/capability architecture in ADR-0017 is the shipped ownership model.
7. Official capabilities are versioned/loadable and representative generated adapters are proven.
8. Pipeline stages preserve explicit task semantics; undeclared inference does not confuse task subject with required capability.
9. Every agent stage has one bounded elapsed-time budget across failover/tools.
10. Natural model stop is accepted; mutation truth comes from observed effects, not model claims or mandatory submit JSON.
11. Keychain is the sole machine credential owner; auth is the sole browser/human login owner.
12. Recovery, git, hooks, quality, Epic/Request and stack behavior are first-class capabilities or shared mechanisms, not parallel systems.
13. Docs are compiled by `@darkfactory/docs`, contain actual TypeScript API documentation, and README is a deterministic projection of the same content source.
14. The shared `@darkfactory/web` release runs on GitHub Pages across consumers without per-repo frontend rebuild.
15. The operator surfaces (CLI/TUI/web/docs) consume one protocol/state/capability model.
16. First-party packages/capabilities publish under the planned `darkfactory` GitHub organization with lockstep product SemVer initially and a separate capability ABI version.
17. Release assets include the CLI/runtime, capability artifacts/adapters and prebuilt web bundle required by the shipped product.
18. All six intended consumers migrate using released df, not manual copy-based installation.
19. `audit.df` independently proves final state.
20. #361 is green and the original #68 graph contract passes against the installed release.

A merged PR, closed issue or passing unit suite is evidence, not final acceptance by itself.

---

## 5. Recovery ledger

The preserved branches remain authoritative recovery inputs:

| Recovery source | Final owner / disposition |
|---|---|
| `recovery/pr-376-clean` | #340 / package-convergence input |
| `recovery/f48-layout` | #340 / #420 convergence input |
| `recovery/f28-dispatch` | Historical #242 provenance; no unique valid implementation |
| `recovery/f14-borrowed-refresh` | #248 -> #422 keychain owner |
| `recovery/f40-capability-tiers` | #331 |
| `recovery/f38-result-capture` | #329 |
| `recovery/f42-tsdoc` | #334 -> #424 docs package |
| `recovery/f42-tsdoc-w2` | #334 -> #424 docs package |
| `recovery/f42-tsdoc-w3` | #334 -> #424 docs package |
| `recovery/f42-tsdoc-w4` | #334 -> #424 docs package |
| `recovery/f44-readme-prd` | #336 -> final hooks/docs owners |
| `recovery/f45-adrs` | #337 |
| `recovery/f47-hooks` | #339 -> hooks capability |
| `recovery/f49-detected-quality` | #341 migration seed |
| `recovery/d4-docs-generator` | #335/#424 |
| `recovery/fix-empty-agent-output` | Provenance only; fully subsumed |

Additional recovery work:

- #251: find/preserve exact prior TUI state before replacement implementation.
- #358: find/preserve any unique F30-4 orchestration state.
- #365 PR #366: evidence only; reuse only compatible deltas.

Every recovered source receives an explicit integrated/superseded/rejected disposition before #361.

Recovery analysis/reconciliation may proceed immediately. A branch's **merge** waits only for the interfaces it actually consumes.

---

## 6. Optimized execution program

### Wave 0 — planning and architecture convergence

Already authorized:

- #420 package/workspace split;
- #421 capability ABI/adapters;
- #422 keychain;
- #423 browser auth;
- #424 docs engine/content graph/README projection;
- #425 shared web control surface.

ADRs 0017–0020 define the durable architectural decisions.

### Wave 1 — bootstrap repair and package foundation

Work starts in parallel:

- **#413**: replace malformed/stale implementation with the narrow stage-kind bridge; no Python task taxonomy.
- **#365**: prepare the TypeScript undeclared-inference fix; merge after #413.
- **#420**: build root Bun workspace and package boundaries on a branch; merge after immediate bootstrap branches are stable enough to avoid unnecessary conflict.
- **#421**: design/implement the minimum capability ABI and loader against #420; full adapter breadth may continue later.
- **#340**: rebuild/reconcile a clean hard-transition branch from current trunk + valid PR407/PR376/F48 input instead of preserving unrelated sweep history.
- **#406**: implement elapsed-time budgeting concurrently and rebase onto final core ownership.
- **#391**: continue unified Planning/review lifecycle implementation concurrently; final merge waits for final state ownership.

The objective is to eliminate bootstrap defects and establish final homes before mass recovery landing.

### Wave 2 — mass recovery reconciliation

As soon as #420 package boundaries and #421 ABI shapes are concrete enough, prepare all recovery lanes concurrently:

- F14 -> #422/#248;
- F40 -> #331;
- F38 -> #329;
- F42 x4 -> #334/#424;
- F44 -> #336;
- F45 -> #337;
- F47 -> #339;
- F49 -> #341;
- D4 -> #424/#335;
- TUI recovery -> #251;
- F30-4 discovery -> #358.

Preparation includes rebase/diff, overlap analysis, test execution and adaptation into final package/capability locations. It does not wait for #388 full productization.

### Wave 3 — core self-hosting chain

These are the **merge gates** for the earliest safe #359 cutover:

1. #413
2. #365
3. #420 package foundation
4. #421 minimum capability ABI/loader
5. #340 final file/config/state naming
6. #406 bounded runtime
7. #391 durable unified Planning/review lifecycle
8. #422 keychain core migration sufficient for production credentials
9. #331 capability-tier routing
10. #329 natural-stop result capture
11. #341 normalized detection + capability-action resolution needed by production verification
12. #358 production graph handlers/resume
13. #317 truthful branch-repair/answer path
14. **#359 production cutover**

#248 may complete alongside #422; its F14 behavior must have a terminal disposition before final release. #252 may proceed in parallel after #365/#421.

### #359 cutover definition

#359 no longer waits for #332, #384, #385, #386, #388 full, TUI, docs/web or final release polish unless a concrete core lifecycle dependency is discovered.

Before cutover derive a fresh mutation ledger covering Request intake/comments, Planning/review/gates, dispatch, PR create/update, branch repair, checks, review/fix, merge/closure, board state, quota resume, failures, settings/workflows and any still-coupled install/release mutation.

Close #359 only when:

- df is the sole mutating production dispatcher;
- the live Request lifecycle uses the unified #391 Planning flow;
- production handlers are real;
- a live df-only Request lifecycle succeeds;
- persisted interruption/resume succeeds;
- legacy Python/shell GitHub mutation is not required for normal production.

At that point the bootstrap-authoring exception expires.

### Wave 4 — self-hosted parallel completion

Once #359 is green, use df itself to finish in parallel:

- #332 safe parallel chunks;
- #339 hook/rule capability from F47;
- #384 deterministic git capability;
- #385 Epic/Request relationships;
- #386 stacked PR capability;
- #388 full governed recovery product/live E2E;
- #403 final composed CLI/command registry;
- #251 TUI from recovered state;
- #248 remaining OAuth/keychain recovery acceptance;
- #252 multimodal provider capability;
- #423 auth package/broker;
- #424 docs engine;
- #334 complete TSDoc/export coverage;
- #335 generated API/architecture publication;
- #425 shared web platform;
- #390 quota/operator dashboard views;
- #336 generated README + docs-impact policy;
- #337 final ADR/notes reconciliation.

Dependencies still apply where one feature consumes another, but unrelated lanes should not wait for each other.

### Wave 5 — distribution and canary

Immediately after #359, produce a **canary/pre-release** sufficient to test:

- clean install of df;
- package resolution;
- official capability loading;
- one consumer repository;
- GitHub Packages publication mechanics;
- prebuilt web artifact deployment;
- update behavior.

This is early feedback, not #360 final acceptance.

Final #360 then publishes the completed lockstep package/capability set and release assets under the `darkfactory` GitHub organization.

### Wave 6 — fleet and closure

1. #360 final release.
2. Migrate five non-DarkFactory consumers using released df; re-check DarkFactory itself.
3. Run install/update twice to prove idempotency.
4. #361 generates and validates `audit.df`.
5. Re-run original #68 graph acceptance against the installed release.
6. Close #68 only when no required child, unexplained recovery source, legacy production engine or unexplained implementation PR remains.

---

## 7. Authoritative Request map

| Request | Start gate | Merge/exit gate |
|---|---|---|
| #413 | now | narrow kind bridge + green checks |
| #365 | now | #413 merged |
| #420 | now | bootstrap branch conflicts reconciled |
| #421 | #420 package shape available | #420 merged; ABI/loader green |
| #340 | now using recovery inputs | #420 final ownership available; hard-transition proof |
| #406 | now | final core ownership + #340 naming |
| #391 | now | #340/#406 persistence/runtime contracts |
| #422 | #420 shape available + F14 recovery | production keychain owner green |
| #248 | F14/#422 reconciliation | keychain contract + unique F14 disposition |
| #331 | F40 reconciliation now | final router/core ownership |
| #329 | F38 reconciliation now | #331 merged |
| #341 | F49 analysis now | #420/#421/#340; normalized detection/capability actions |
| #358 | F30-4 discovery now | #329/#331/#391 + production owners |
| #317 | preparation after #341 shape | #358/#341; truthful mutation evidence |
| #359 | mutation-ledger preparation now | core self-hosting chain above |
| #252 | #365/#421 shapes | provider/capability integration green |
| #332 | design may start before cutover | #358/#329/#331; preferably self-hosted |
| #339 | F47 reconciliation now | #421 + #341 actions + final mutation owners |
| #384 | primitive work may start now | #358 persisted conflicts + #339 hooks where applicable |
| #385 | model design may start now | #358 Request/state owner |
| #386 | topology design may start now | #384/#385/#358 |
| #388 full | recovery product work may start now | #391/#358/#384/#385/#386 + live recovery E2E |
| #403 | command model may start after #420/#421 | final composed post-cutover surface |
| #251 | recovery discovery now | #403 + recovered TUI reconciliation |
| #423 | #420 protocol/github boundaries | GitHub App auth/browser/broker tests |
| #424 | D4/F42/F44 analysis now | #420/#421 + docs/content graph green |
| #334 | F42 reconciliation now | final public exports + #424 extraction |
| #335 | D4 analysis now | #424/#334/#341 |
| #425 | UI architecture may start now | #423 auth + #424 content boundary + shared web release |
| #390 | quota-view work may start once #425 shell exists | #425 + shipped quota/provider protocol |
| #336 | F44 reconciliation now | #424 generated README + #339/#341 docs-impact owners |
| #337 | F45 reconciliation now | architecture/product materially final |
| #360 | canary immediately after #359 | all required final product Requests terminal |
| #361 | prepare audit schema before release | six-repo released-df migration green |
| #68 | final audit preparation | #361 + original graph acceptance green |

---

## 8. Release and publication contract

### 8.1 Versioning

Initially all first-party packages and official capabilities use one lockstep DarkFactory SemVer. The capability ABI has its own compatibility version.

### 8.2 GitHub Packages

The intended namespace is the new `darkfactory` GitHub organization, enabling clean scoped packages such as:

- `@darkfactory/core`;
- `@darkfactory/cli`;
- `@darkfactory/web`;
- `@darkfactory/capability-code`.

### 8.3 Standard installation

The normal df installation is batteries-included with official capabilities, while third-party capabilities use the same loader/ABI. Users are not required to install the official capability set one package at a time.

### 8.4 Release assets

Final release assets include, as applicable:

- CLI/runtime artifacts;
- checksums and source provenance;
- prebuilt DarkFactory Web bundle;
- official capability bundles;
- generated MCP/plugin/skill forms;
- runtime schemas/graph/data required for source-free operation.

The npm execution path remains Node-compatible and does not require Bun or a source checkout.

---

## 9. Docs/web deployment contract

A consumer deployment consists of:

1. released prebuilt DarkFactory web bundle;
2. repository-specific docs/content/data compiled by df;
3. GitHub Pages publication.

The consumer does not compile the frontend.

The live browser uses GitHub user authentication through #423 and reads GitHub state directly. Privileged automation remains App/df-owned.

No API key, refresh token, GitHub App private key or machine credential may be embedded into static Pages artifacts.

---

## 10. Final fleet acceptance

Resolve repositories by stable GitHub identity rather than historical names.

Current fleet:

1. DarkFactory
2. omnis
3. ChessWithQuests
4. OdbornaPrace-paper
5. template-OdbornaPrace
6. OdbornaPrace-mono

Per repository, final audit covers at least:

- stable repository ID/name/SHA/default branch;
- installed df release/source;
- repo/config/docs resolution;
- package/domain/capability detection;
- managed-file/workflow drift;
- protection and required checks;
- test/lint/format/docs actions;
- keychain/auth diagnostics without secret exposure;
- Request/Epic and stack state;
- recovery provenance/dispositions;
- docs/API/README generation;
- shared web deployment/auth boundary;
- release/package/capability provenance;
- install/update idempotency.

`audit.df` records these results plus #359 zero-legacy proof, a released-df-only lifecycle/resume proof and remaining Request/PR audit.

---

## 11. Regressions that must not return

- `.darkfactory/manifest.json` or `.github/darkfactory.json` as final repository contract;
- `.darkfactory/df/config.json`;
- `.df/` directories;
- hard-coded `main`;
- final monolithic `@darkfactory/harness` ownership;
- a second provider/model catalog;
- a second credential/keychain system;
- provider/capability-owned raw secret storage;
- a second auth/RBAC database for the web UI;
- a second git, hook, Request/Epic, stack or Planning/review engine;
- hard-coded repository-specific language/action tables where capabilities should contribute behavior;
- mandatory task submit/JSON completion;
- keyword-based mutation truth;
- production shell `gh` mutation;
- Python as production orchestration;
- ProperDocs/MkDocs as final docs runtime;
- separate docs/dashboard frontends;
- per-consumer React builds;
- README maintained independently from the canonical docs homepage content;
- manual consumer installation or manual recovery merge as final proof;
- fixed historical test counts as acceptance.

---

## 12. Maintenance rule

Update this file only when one of these changes:

- final architecture;
- a cross-Request start/merge/final dependency;
- recovery ownership/disposition;
- self-hosting/cutover boundary;
- release/fleet/final acceptance;
- the set of Requests required for completion.

Do not append transient run state or checkpoints. GitHub already owns live status.
