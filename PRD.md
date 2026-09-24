# DarkFactory — Product Requirements Document

**Status: NORMATIVE.**

DarkFactory is a self-hosting autonomous software-delivery system built around a declarable workflow graph, versioned capabilities and GitHub as its durable control plane. This document defines stable product outcomes and architectural constraints. `PLAN.md` records repository-wide execution strategy; the active Request/Planning record carries the concrete implementation checklist, approvals and validation evidence in GitHub.

## 1. Authority

1. `PRD.md` defines product requirements and architecture.
2. Current active Request/Planning records define approved feature-specific behavior and executable delivery scope.
3. Accepted ADRs under `.agents/notes/adr/` record durable decisions and rationale.
4. `repo.df`, `config.df`, `docs.df` and the workflow graph are executable declarations.
5. `.agents/rules/*.md` define mandatory contribution/governance behavior.
6. Generated docs/README/web views are projections, not independent sources of truth.

A material deviation from this document requires owner approval and an accepted ADR.

## 2. Product vision

DarkFactory turns a repository into a governed autonomous software factory.

A human supplies intent and approvals. DarkFactory performs planning, implementation, deterministic verification, review/fix iteration, alignment, Git/GitHub mutation, CI coordination, merge/reconciliation, release and audit through one production engine.

The system must be:

- **self-hosting** — df is used to finish and evolve DarkFactory itself;
- **governed** — explicit approval gates bind human intent;
- **resumable** — interruption, quota exhaustion and conflicts do not lose completed effects;
- **truthful** — completion/mutation claims come from observed state, not agent prose;
- **extensible** — new project-specific behavior can be added as capabilities rather than rebuilding core;
- **multi-domain** — one repository may contain code, papers, mathematics and other supported package types;
- **GitHub-native** — GitHub remains the durable issue/PR/check/project/event/authorization control plane;
- **source-free in production** — released df installs and runs without a DarkFactory source checkout.

## 3. Actors

| Actor | Responsibility |
|---|---|
| Maintainer/operator | Supplies intent, approves Planning/scope amendments/final merge as required, operates df through CLI/TUI/web. |
| DarkFactory engine | Executes graph/runtime mechanisms, routing, persistence, capability loading and deterministic effects. |
| Capability | Implements agentic/product behavior such as planning, review, git, docs, CI, recovery or domain-specific work. |
| DarkFactory GitHub App | Automation identity and privileged GitHub execution identity. |
| Authenticated web user | Human identity used by DarkFactory Web for user-attributed GitHub access/actions. |
| Consumer repository | Supplies project-specific declarations/data while consuming released df and the shared web application. |

## 4. Workspace and package architecture

DarkFactory is a root Bun workspace.

The final first-party package boundaries are:

- `@darkfactory/protocol` — browser/runtime-safe schemas, serialized state/event contracts and shared types;
- `@darkfactory/core` — execution kernel, graph/run state, provider/router mechanisms and config resolution;
- `@darkfactory/capability` — capability ABI, discovery/loader/resolution and deterministic adapter/build tooling;
- `@darkfactory/github` — typed GitHub REST/GraphQL substrate with explicit browser/server-safe entrypoints;
- `@darkfactory/keychain` — machine/runtime credential custody and authentication;
- `@darkfactory/auth` — human/browser GitHub App authentication and sessions;
- `@darkfactory/docs` — headless documentation compiler/content graph;
- `@darkfactory/cli` — `df` command, command composition and interactive TUI ownership;
- `@darkfactory/web` — the sole first-party web application/renderer.

Any remaining implementation under `harness/` is deletion-bound source during the rebuild. It is not a public package, documentation surface, or final architecture boundary.

Package dependencies must remain acyclic. Browser-safe entrypoints cannot import machine-secret/private-key/runtime-only implementations.

## 5. Capability architecture

Core owns mechanisms. Agentic/product behavior belongs in versioned capabilities under root `capabilities/`.

The initial first-party capability set includes at least:

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

A capability may contribute:

- setup and ecosystem/package-specific deterministic actions;
- tools and commands;
- graph-node behavior;
- deterministic actions;
- verification/quality actions;
- hooks/rules;
- documentation;
- web surfaces/metadata;
- release outputs;
- audit records;
- credential requirements.

Capabilities do not own raw credential storage.

One canonical TypeScript capability definition is the implementation source. Build tooling deterministically produces supported integration forms, including:

- native DarkFactory/Pi integration;
- Pi ExtensionAPI tools/commands;
- standalone MCP server form;
- supported Claude/Codex/agent skills/plugins/manifests.

There must not be independent handwritten implementations of the same capability for each runtime surface, agent integration, or consumer.

Official capabilities use the same loader/ABI as third-party capabilities. The normal df distribution includes the official capability set so standard installation remains batteries-included.

The capability ABI is versioned independently from product SemVer.

## 6. Domains, ecosystems and project detection

DarkFactory retains separate concepts:

- **ecosystem** — toolchain/package format, such as Bun/Node, Python, Rust, Typst, LaTeX or Lean;
- **package** — one buildable unit in a repository/workspace;
- **domain** — the semantic kind of work, initially including `code`, `paper` and `math`;
- **capability** — behavior DarkFactory can perform.

Repositories may be polyglot and multi-domain simultaneously.

Detection discovers repository/package/domain evidence. Capability resolution then selects applicable capability-contributed actions such as test, lint, format, docs, setup and release behavior.

The final system must not rely on one ever-growing repository-specific language/command table when behavior can be provided by a capability.

## 7. Configuration and persisted state

### 7.1 Repository/runtime configuration

The repository declaration rules are:

- repository declaration is `repo.df`;
- runtime/user/provider configuration is `config.df`;
- accepted location is `.darkfactory/<name>.df` or root `<name>.df`;
- both locations for the same logical file is an error;
- only the current `repo.df` / `config.df` contracts are read;
- `.df` is a filename extension, never a directory.

### 7.2 Documentation configuration

Documentation uses `docs.df` as the native DarkFactory configuration.

`docs.df` is the only DarkFactory documentation configuration contract.

Documentation configuration does not move into `repo.df` or `config.df`.

### 7.3 State

Df-owned config/state/result/review/audit artifacts use appropriate `.df` filenames in their owning locations.

## 8. Governed Request lifecycle

The final Request lifecycle is:

1. capture verbatim Request/context and relationships;
2. generate one unified Planning artifact;
3. independently review Planning;
4. automatically fix/re-review Planning until clean;
5. one explicit owner Planning Approval;
6. implement;
7. deterministic verification;
8. implementation review/fix loop until clean;
9. scope-amendment approval only when implementation/review identifies material work outside approved Planning;
10. final alignment against approved Planning plus approved amendments;
11. external/static checks;
12. final review/merge authorization;
13. merge and deterministic reconciliation.

The lifecycle has one reviewed Planning artifact and one Planning Approval gate.

Planning/review/fix state is durable and resumable. Planning becomes stale when material Request, dependency, recovery or base context changes; stale approval is never silently reused.

A model stopping naturally is valid completion. Code-node truth derives from engine-observed workspace/diff/scope/verification/commit evidence. Judgement prose may be structurally extracted through ordinary routed model calls.

Model claims such as “pushed”, “merged”, “committed” or “resolved” are not accepted as mutation proof without corresponding observed effects.

## 9. Runtime, routing and resilience

- Pipeline stages pass explicit semantic task kind where known.
- Undeclared inference separates task subject from required capability; engineering work about images/video must not be misrouted to media-generation tools.
- Routing respects sensitivity, data-collection policy, provider/account availability, capability requirements and capability tiers.
- Capability tiers prefer the lowest sufficient tier and escalate deterministically according to the shipped routing contract.
- Quota/provider failover is durable and does not repeat already-completed deterministic effects.
- Execution is serializable per durable run identity: concurrent ingress for the same run cannot lose state, run the same node concurrently, or overwrite a newer transition.
- External effects are serializable per deterministic effect identity. Concurrent callers of the same effect cannot both enter the mutation; crash recovery reconciles external evidence before retrying.
- Transport retries are method/effect aware. A mutation is never blindly replayed after an ambiguous transport/server outcome; the engine reconciles external state or uses an operation with equivalent conditional/idempotent semantics first.
- Authoritative state uses crash-consistent transactions appropriate to its scope. A rename-only single-file update is not described as durable across power loss unless file and directory durability are actually established; logically multi-file state commits through one generation/transaction boundary.
- Every agent-backed logical stage has one bounded wall-clock budget across model failover and tool work.
- Planning decomposes work into the smallest practical independently verifiable chunks with explicit dependencies, scope/file ownership and minimum capability/tier metadata sufficient to decide safe parallelism.
- Independent chunks may execute concurrently only through the same persisted graph runtime in isolated engine worktrees backed by the one deterministic git substrate. Verified chunk commits integrate in dependency order; sibling failure, interruption and conflict repair remain resumable without repeating completed effects.
- Quota admission is atomic with respect to concurrent model calls: declared/learned capacity is reserved before dispatch and settled/released from observed usage so parallel chunks cannot all consume the same remaining slot.
- Turn limits and elapsed-time limits are independent safety bounds.
- Timeout, quota exhaustion, authentication failure, model failure and user cancellation are distinct outcomes.
- The runtime remains containerizable/non-root for CI execution.

## 10. Git, GitHub and governance

Production GitHub interaction uses `@darkfactory/github`; production shell/subprocess `gh` mutation is not allowed.

Deterministic workspace/git mechanisms own status/diff/log/fetch/branch/update/rebase/merge/cherry-pick/conflict continuation/abort and lease-safe pushes. A push contract identifies both the expected old remote SHA and the new local SHA, verifies the resulting remote ref, and refuses stale remote state. Models may assist conflict resolution but do not own deterministic git state.

GitHub webhook/workflow events are triggers, not authoritative lifecycle snapshots. Status, labels,
project fields, bindings and cleanup decisions are reconciled from current GitHub/runtime state so
delayed or out-of-order events are idempotent and cannot roll newer state backward.

Capabilities provide higher-level behaviors such as:

- GitHub Request/PR/project operations;
- hooks/rule enforcement;
- Epic/Request relationships;
- stacked PR topology;
- recovery intake/reconciliation.

Static CI checks remain external to the runtime graph where appropriate; graph check-reference nodes observe them rather than duplicating them.

The repository default branch is always discovered from repository state/config, never hard-coded to `main`.

## 11. Keychain and machine credentials

`@darkfactory/keychain` is the sole machine/runtime credential owner.

Credential/account/vault updates are transactionally serialized. Multi-file vault representations cannot expose a mixed generation after interruption. Replicated/synchronized secret state converges deterministically regardless of merge direction, represents deletion explicitly so removed secrets cannot be resurrected by stale replicas, and does not resolve equal-version conflicts by caller-local preference.

It covers:

- OS-native secure storage;
- encrypted fallback where supported;
- environment/import sources;
- provider API keys;
- provider OAuth/device/login flows;
- access/refresh token refresh and rotation;
- multiple accounts/credential slots;
- borrowed external-CLI credentials without mutating the source CLI;
- GitHub App private key/JWT/installation-token handling;
- CLI-side GitHub user credentials;
- scopes/audience/expiry metadata;
- redaction;
- secret scanning;
- import/export;
- diagnostics.

Other packages/capabilities request scoped credential handles. They do not directly inspect secret environment variables, credential files or OS keychains.

Secret values are never committed, written to issues/PRs, included in generated docs/static Pages assets or emitted in logs.

## 12. Human web authentication

`@darkfactory/auth` is separate from keychain and owns DarkFactory Web human authentication.

It uses the existing DarkFactory GitHub App.

The normal browser flow provides:

- GitHub App user authorization;
- PKCE and state/CSRF protection;
- minimal confidential token exchange/refresh broker;
- expiring access-token/session management;
- refresh;
- logout/revocation;
- session restoration.

The broker is authentication infrastructure only. It has no DarkFactory project database, Request/pipeline state, model credentials or execution API.

Authorization derives from GitHub user permissions plus the App installation/permissions. DarkFactory does not maintain a second RBAC database.

Human-attributed GitHub actions retain user identity. Privileged automation remains the GitHub App/df identity.

Browser artifacts cannot contain/import the GitHub App private key, confidential broker credentials or keychain implementation.

## 13. Documentation

`@darkfactory/docs` is the final documentation engine.

It compiles one typed content graph from:

- canonical Markdown/root documents;
- ADRs and rules;
- actual TypeScript/TSDoc API extraction;
- capability-contributed documentation;
- repository/graph/workflow metadata;
- supported API extractors for other ecosystems.

TypeDoc may be used internally as the TypeScript/TSDoc extractor.

Documentation builds are deterministic, strict and zero-warning for required API surfaces.

The docs homepage and committed `README.md` are two renderers of the same canonical semantic content. CI fails when the README projection drifts.

README is therefore not an independent product-description source.

## 14. DarkFactory Web

`@darkfactory/web` is the only first-party web UI.

It is a prebuilt React/TypeScript application released once per DarkFactory version and reused unchanged by consumer repositories.

Preferred design stack:

- React;
- TypeScript;
- shadcn/ui;
- lucide-animated;
- Motion;
- Dagre;
- Wouter;
- Dockview where a docking/workspace layout is materially useful.

A consumer does not rebuild the frontend. Its Pages artifact combines the released web bundle with repository-specific compiled content/data.

The application remains dynamic on GitHub Pages by reading live GitHub REST/GraphQL state through browser-safe GitHub/auth interfaces.

The target web surface includes, as shipped capabilities become available:

- repository overview;
- Requests and Planning;
- Epics/dependencies;
- recovery;
- PRs/stacks;
- checks/runs;
- graph execution;
- providers/accounts/quota status where safe;
- releases;
- capabilities;
- project configuration;
- audit;
- documentation.

DarkFactory Web becomes the primary day-to-day operator interface. Direct use of github.com UI is optional for normal DarkFactory operation except where GitHub itself requires a consent/review surface.

The web application is not a second state database or privileged mutation engine.

## 15. CLI and TUI

The supported command is `df` from `@darkfactory/cli`.

One command registry composes core/capability commands and drives:

- CLI dispatch/help;
- wrapper/system-`df` coexistence;
- interactive TUI;
- web/operator command metadata where applicable.

Bare interactive `df` enters the TUI when appropriate. Headless commands remain scriptable.

The CLI/TUI/web surfaces consume the same protocol/state/provider/capability models.

## 16. Installation, release and versioning

First-party packages and official capabilities are published under the planned `darkfactory` GitHub organization.

Initial first-party versioning is lockstep: one DarkFactory SemVer across first-party packages/capabilities, with a separate capability ABI version.

The final release contains, as required:

- Node-compatible npm execution path;
- supported native artifacts where CI can build **and execute** them;
- source commit/version provenance;
- checksums;
- official capabilities;
- capability adapter artifacts/MCP/plugin/skill forms;
- graph/schema/runtime data;
- prebuilt DarkFactory Web bundle.

Initial installation must not require Python, a source checkout or a pre-existing df installation.

Before a release-affecting delivery PR merges, an unpublished source-free candidate built from its exact head/tree must pass the applicable DarkFactory and fleet acceptance contract. Final publication occurs from canonical after merge without behavioral source changes; the published artifacts must reproduce the proven candidate behavior/assets aside from canonical source-provenance metadata.

The standard installation includes official capabilities while allowing third-party capabilities through the same loader.

## 17. Consumer/fleet model

The intended fleet contains six repositories identified by stable GitHub repository identity:

1. DarkFactory;
2. omnis;
3. ChessWithQuests;
4. OdbornaPrace-paper;
5. template-OdbornaPrace;
6. OdbornaPrace-mono.

Consumers receive released df and managed project-specific setup. They do not receive copied DarkFactory source trees and do not rebuild the shared React application.

Capabilities should handle project/repository-specific setup wherever possible, including quality actions, docs, hooks, release and workflow configuration.

Install/update is idempotent and drift-aware.

## 18. Security requirements

- No credential/token/private key in source, logs, issues, PRs, docs or Pages assets.
- Browser packages have enforced import boundaries from machine-secret code.
- Third-party capabilities receive only declared/scoped credential access.
- GitHub user authorization is not treated as GitHub App installation authority.
- History rewriting uses lease-safe expected-old-SHA semantics; blind force push is forbidden.
- Recovery never pushes secret-bearing local material.
- Authentication and authorization failures fail closed.

## 19. Final acceptance

DarkFactory is final only when the exact pre-merge candidate has passed the declared acceptance/fleet contract and the final canonical publication can reproduce it without behavioral source changes, and:

- df is the only normal production orchestration/mutation engine;
- production orchestration and mutation are owned by the final TypeScript df system;
- package/capability architecture is shipped;
- official capabilities and representative generated adapters are proven;
- keychain/auth security boundaries are proven;
- real TypeScript API docs are published;
- README generation from docs content is deterministic;
- shared web UI is deployed across the fleet without consumer frontend rebuild;
- the source-free pre-merge candidate installs/updates cleanly, and the canonical publication reproduces that behavior;
- all six repositories pass governance, detection, capability, docs/web, release-candidate and drift checks before the integration merge;
- `audit.df` is internally consistent;
- installed fleet acceptance is green across the supported consumer set before merge;
- the declarable-graph product contract passes against the installed exact-head candidate and is re-smoked against the canonical publication.
