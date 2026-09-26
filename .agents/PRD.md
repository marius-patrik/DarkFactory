# DarkFactory — Product Requirements Document

**Status: NORMATIVE.**

DarkFactory is a self-hosting autonomous software-delivery system built around a declarable workflow graph, versioned capabilities and GitHub as its durable control plane. This document defines stable product outcomes and architectural constraints. The active Request/Planning record carries the concrete implementation checklist, approvals and validation evidence in GitHub.

## 1. Authority

1. `.agents/PRD.md` defines product requirements and architecture.
2. Current active Request/Planning records define approved feature-specific behavior and executable delivery scope.
3. Accepted ADRs under `.agents/adr/` record durable decisions and rationale.
4. The combined `repo.dfconfig` document (or accepted root `config.dfconfig` or `.dfconfig` alias) and the workflow graph are executable declarations.
5. `.agents/rules/*.md` define mandatory contribution/governance behavior.
6. Generated docs/web views and `.agents/AGENTS.md` are projections, not independent sources of truth.

A material deviation from this document requires owner approval and an accepted ADR.

## 2. Product vision

DarkFactory is one system that is at once a library, a framework, a pipeline, a developer tool, a workspace manager and an operator of machines. Those are not products sharing a name; they are one capability — act on a system through a declared interface — observed at several scales: a function call, a file, a repository, a pipeline, a machine, a fleet.

A human supplies intent and approvals. DarkFactory performs planning, implementation, deterministic verification, review/fix iteration, alignment, Git/GitHub mutation, CI coordination, merge/reconciliation, release and audit through one production engine.

The system must be:

- **self-hosting** — df is implemented in df and maintained by df via df, so a change to DarkFactory is proposed, interpreted, planned, implemented, reviewed, verified and merged by DarkFactory with humans approving rather than authoring;
- **both tool and platform** — usable directly, and extensible by code DarkFactory has never seen, so the capability surface and `.df` are published contracts carrying a compatibility promise that internal refactors do not;
- **governed** — explicit approval gates bind human intent;
- **resumable** — interruption, quota exhaustion and conflicts do not lose completed effects;
- **truthful** — completion/mutation claims come from observed state, not agent prose;
- **AI-first** — the agent is a first-class operator of the same abstractions as any other caller, its capability set is presented rather than fixed, and its mutations are staged and reversible. Removing the agent must leave the system incomplete, otherwise this is a system with an agent attached;
- **extensible** — new project-specific behavior can be added as capabilities rather than rebuilding the framework;
- **unfrictional across machines, repositories and hosting types** — one semantic model with no location-dependent behaviour. A capability behaves identically in a working tree, on a host or in CI, and a declaration means the same thing in a repository and on a machine. Support matrices are not sufficient: each row is a promise to maintain and each per-location special case is a place an abstraction has leaked;
- **multi-domain** — one repository may contain code, papers, mathematics and other supported package types;
- **declarable** — anything config-shaped in nature is data rather than code, resolved through inspectable layers, and bound systems are reached through seams rather than reimplemented;
- **GitHub-native** — GitHub remains the durable issue/PR/check/project/event/authorization control plane;
- **source-free in production** — released df installs and runs without a DarkFactory source checkout.

`.agents/THESIS.md` records why the system is shaped this way and is non-normative. Where it and this document disagree, this document wins.

## 3. Actors

| Actor | Responsibility |
|---|---|
| Maintainer/operator | Supplies intent, approves Planning/scope amendments/final merge as required, operates df through `Surfaces/Terminal/` and `Surfaces/Renderer/`. |
| DarkFactory engine | Executes graph/runtime mechanisms, routing, persistence and deterministic effects. |
| Capability | Implements agentic/product behavior such as planning, review, git, docs, CI, recovery or domain-specific work. |
| DarkFactory GitHub App | Automation identity and privileged GitHub execution identity. |
| Authenticated human user | Human identity used by `Surfaces/Renderer/` for user-attributed GitHub access/actions. |
| Consumer | Supplies project-specific declarations/data while consuming released df and the shared web application. A consumer is a repository, a machine, or a fleet of either. |

## 4. Workspace and package architecture

DarkFactory is a DarkFactory workspace **and** a DarkFactory application. Both halves are
required, and neither is a mode.

As a workspace it hosts the framework: the concerns, the seams, the capabilities and the
surfaces that §4.3 sets out. As an application it is a consumer of that framework with no
private path — every folder it contains is a folder any consumer could contain, and every
capability it uses is one it could obtain. The DarkFactory repository is therefore its own
first consumer, and any behaviour that works only because of something specific to this
repository is a defect in the framework rather than a property of the application.

This is the structural form of §2's self-hosting requirement. Self-hosting is not only a claim
that df can build df; it is a requirement that the workspace and the application are the same
shape, so that "df built this" and "a consumer built this" are the same statement.

The consequence to hold onto when reading the tree below: nothing in it exists for DarkFactory's
benefit. `darkfactory/` is not the system's own directory with a privileged copy inside; it is
what any repository's copy looks like.

### 4.1 Structure is the declaration

Meaning lives in exactly one place: the code. Folders, file names, function names, signatures
and doc comments are the declaration, and the interpreter reads meaning from them. Nothing
describes a feature except the feature.

Consequently:

- There is no privileged core subset. A top-level folder declares a *concern*; the set of
  concerns is itself content, so a concern can be added or removed without amending this
  specification. The question "is this core or content?" is not asked, because what a thing
  needs is already answered by where it sits and what it sits beside.
- One file is one askable feature — the unit a caller can request on its own. Not one step
  inside a larger operation, and not one abstraction grouping several asks.
- Folders are named for concerns. `utils`, `helpers`, `common`, `shared`, `manager`, `core`
  and `lib` are forbidden at any depth, because a name that means "the rest" cannot be
  resolved to anything.
- No `index.ts` or equivalent barrel exports. Re-exporting reintroduces a place where the set
  of things is written down separately from the things.
- No registry, manifest, catalogue or index enumerates features. Discovery is structural: a
  folder is discovered by existing.
- Doc comments are normative. What a feature publishes to every surface is its own
  documentation, so a comment is part of the contract and not decoration.

### 4.2 Declaration and implementation are separate files

A binding is a declaration beside its implementation. The declaration states what a thing is
bound to; the implementation carries the code. Both are read by the same interpreter, and a
binding with no implementation in the current backend is an error rather than a silent absence.

- `.df` — a declaration: a binding, a scope configuration, a pipeline graph, or a
  configuration that performs no behaviour of its own.
- `.ts` — an implementation, written in TypeScript with the declaration's meaning carried
  through `import ... with { type: "df" }`.

Data that is merely data stays `.json`. A file is promoted to `.df` only once compilation must
*interpret* it rather than read it.

### 4.3 The tree

```
/                                       any repository that adopts DarkFactory
├── repo.dfconfig                       this scope's configuration; any *.dfconfig, one per scope
├── graph.df                            the pipeline: nodes, edges, convergence
├── providers.json                      provider configuration — data
├── models.json                         model catalog and preference order — data
│
└── darkfactory/
    │
    ├── Meaning/                        reading code and declarations into a resolution
    │   ├── InterpretLanguage.df        read code and declarations into meaning
    │   ├── DeriveInterface.df          code, names, signatures and comments → the interface
    │   ├── ResolveConfig.df            find the declaration for a scope
    │   ├── ResolveReference.df         follow a name through structure
    │   ├── SelectBackend.df            given an intent, choose the implementation
    │   ├── ComposeGraph.df             resolved capabilities → the executable plan
    │   └── Compiler.df                 bind to a version; emit every surface; emit the local Change backend
    │
    ├── Change/                         the only way the world is read or altered
    │   ├── ReadState.df  Snapshot.df  Stage.df  Publish.df  OpenChange.df  Identify.df
    │   ├── git/        git.df · git.ts
    │   ├── github/     github.df · github.ts
    │   └── local/      local.df · (emitted by Compiler.df)
    │
    ├── Execution/                      running, gating, and healing
    │   ├── ExecuteGraph.df  ResumeRun.df  EmitEvent.df  EnforceGate.df
    │   ├── Converge.df                 observe, diff against derived intent, converge
    │   ├── DeriveEnvironment.df  RecordTranscript.df
    │   ├── AllocateAgent.df  RankCandidates.df  ResolveModel.df  EnforceQuota.df
    │   ├── RecordSpend.df  AttributeRun.df  BindProvider.df
    │   └── DiagnoseRun.df
    │
    ├── Identity/                       proving and being someone; not agent-specific
    │   ├── identity/  DeclareIdentity.df  RevokeIdentity.df  AttributeUse.df
    │   ├── proof/     BearerToken.df  OAuthGrant.df  ClientCertificate.df  SshKey.df
    │   │              Passkey.df  TimeBasedCode.df  DeliveredCode.df
    │   │              SessionCookie.df  SignedRequest.df
    │   ├── acquire/   LoginFlow.df  ExchangeDeviceCode.df  ApproveRequest.df
    │   │              PresentChallenge.df  AwaitChallenge.df
    │   └── hold/      LocalSeal.df  RemoteVault.df  SplitSecret.df
    │                  ReassembleSecret.df  BindHolder.df  RotateProof.df
    │
    ├── Browse/                         the seam both the human and the agent navigate
    │   ├── Browse.df                  the interface
    │   ├── tauri/      tauri.df · tauri.ts      one process, N presenters, one session
    │   └── headless/   headless.df · headless.ts   for an agent that only needs to act
    │
    ├── Capabilities/                   content
    │   ├── code/       GenerateDocs.ts  ExplainCode.ts  ReviewDiff.ts …
    │   ├── planning/   PlanWork.ts  ScopeWork.ts …
    │   ├── review/     ReviewChange.ts  ProposeChange.ts …
    │   ├── docs/  hooks/  math/  paper/  release/
    │   ├── resolve/    resolve.df · ResolveCapability.ts  BindCapability.ts  RankCapabilities.ts
    │   └── github/     OpenIssue.ts  CommentOnIssue.ts  ReconcileState.ts …
    │
    └── Surfaces/                       projections; no behaviour of their own
        ├── Terminal/   terminal.df · terminal.ts     CLI and TUI
        ├── Renderer/   renderer.df · renderer.ts     the human's window
        ├── Docs/       docs.df · docs.ts
        ├── MCP/        mcp.df · mcp.ts               an agent's presenter, no window
        ├── Claude/     claude.df · claude.ts         plugin and skill forms
        ├── Codex/      codex.df · codex.ts
        └── GitHub/     github.df · github.ts
```

Every surface is a projection of one derived resolution and contains no per-feature
implementation. A surface is added by adding a folder; it is never added by adding an adapter
to each capability.

### 4.4 Identity is not scoped to a caller

Identity is a first-class concern of the system rather than a property of the execution
runtime. `df` on an unconfigured machine, the Renderer completing a GitHub App login, an
external Claude or Codex plugin, and an agent in CI all need to prove who they are, and each
obtains it through the same `Identity/` concern.

An identity is a declaration plus one or more proofs, and a proof is not restricted to a
stored secret. A proof may be stored, derived, or exist only for the duration of a flow. The
system must support at minimum: long-lived bearer tokens, OAuth grants, mTLS client
certificates, SSH keys, passkeys, time-based one-time codes, codes delivered to another
channel, and opaque session cookies. An identity is acquired through a flow that may require a
human or a second device, so acquisition is part of the concern and not an assumption of prior
provisioning.

### 4.5 Rules the structure must satisfy

- Adding or removing a file changes only what that file names. No other file requires
  modification, and no build description, index or list is updated.
- Discovery is by filesystem structure alone, and a discovered folder is usable without being
  registered.
- Package dependency direction is acyclic and follows structure, so that a folder's
  requirements are visible from where it sits.
- A surface exposes every feature. A feature that cannot be reached from a surface does not
  exist.
- Compilation is release: the resolved system is bound to a version, and every artifact is
  emitted at that version. A version is part of what compilation resolves.
- The build description of the system is the system. There is no second hand-written
  description of how it is assembled, bundled, signed or published.

## 5. Capability architecture

Agentic and product behaviour belongs in versioned capabilities under `Capabilities/`. Mechanisms belong to the
concern that owns them, and there is no privileged subset: which concern a thing belongs to is answered by what
it needs, not by an internal package boundary. Version control is reached through the `Change/` seam and is not a
capability; neither is environment derivation or convergence, which are `Execution/`.

The initial first-party capability set includes at least:

- code;
- docs;
- hooks;
- math;
- paper;
- release;
- planning;
- review;
- resolve;
- github.

`resolve` — discovering, binding and ranking capabilities — ships as a capability so a consumer may resolve
differently without contending with the mechanism. The normal distribution includes it, so a standard
installation is batteries-included without the concern being privileged.

`github` appears in two places for two different reasons, and the distinction is required rather than
incidental. `Change/github/` is the seam binding that lets the system act on a GitHub repository. 
`Capabilities/github/` is GitHub as a place work comes from and goes to: issues and pull requests as requirement
intake, review destination and reconciliation. Neither substitutes for the other.

A capability may contribute:

- setup and ecosystem/package-specific deterministic actions;
- tools and commands;
- graph-node behavior;
- deterministic actions;
- verification/quality actions;
- hooks/rules;
- documentation;
- surface metadata;
- release outputs;
- audit records;
- credential requirements.

Capabilities do not own raw credential storage.

One canonical TypeScript capability definition is the implementation source, and every surface a capability is reachable through is derived from it rather than written against it. Supported integration forms, including:

- native integration;
- `Surfaces/MCP/` server form;
- supported Claude/Codex/agent skills/plugins/manifests.

There must not be independent handwritten implementations of the same capability for each runtime surface, agent integration, or consumer. A capability has semantics; each surface is a renderer of those semantics. Adding a surface is one renderer, not one adapter per capability.

Every capability is reachable through every supported surface: `Surfaces/Renderer/`, `Surfaces/Terminal/`, the
GitHub surface, and external agent harnesses as MCP servers and plugin/skill forms.

Compiling and releasing are one operation. Compilation binds the resolved system to a version and emits it in every surface form at that version, so a version is part of what compilation resolves rather than a label applied afterwards. There is no separate build description of the system that could disagree with the system.

Official capabilities use the same loader/ABI as third-party capabilities. The normal df distribution includes the official capability set so standard installation remains batteries-included.

The capability ABI is versioned independently from product SemVer.

### 5.1 Declaration interpretation

Reading is the whole of df's mechanism rather than one part of it. Every scale a consumer
works at — a function, a file, a repository, a pipeline, a machine, a fleet — is a shape the
same reading resolves, with no separate mechanism per scale.

Reading is itself bound through the same seam as any other system: a small vocabulary, several
implementations, and a declaration that names one. §4.1 of the thesis carries the argument in
full; the requirement here is that no declaration language is privileged.

A feature's interface is **derived** rather than authored. It is read from the feature's names,
its signatures, its position in the tree and its documentation, and published to every surface.
No file states what a feature is, and no surface implements one.

- A declaration is interpreted through a named backend. TypeScript is the first-party backend for `.df`. Further backends exist so that declarations authored in another system's own language stay first-class instead of requiring translation into ours.
- A declaration written for a bound system remains in that system's language. Where a consumer's machine-level configuration is authored in a foreign declaration format, df resolves and composes it rather than re-expressing it.
- Backend selection is declarative. Capability availability is not conditional on which interpreter is present.
- Interpretation is read-only with respect to the declaration. Evaluating a declaration never mutates it; applying it produces state through the ordinary governed effect path.
- The interpreter is declarable: which backend interprets a declaration, and the systems layer and interpreter revision it loads, are chosen by declaration rather than hardcoded. A system that can describe its own configuration can describe the thing doing the describing.

This is what lets the system span machines and repositories under one semantic model: the interpreter is chosen per declaration, not per location.

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

### 7.1 Combined repository/runtime configuration

The combined configuration rules are:

- root `repo.dfconfig` is canonical, with root `config.dfconfig` and root `.dfconfig` accepted as aliases for the same logical document;
- the JSON document owns `repo`, `docs`, and `providers` blocks, and every consumer selects its declared block;
- `repo` owns repository identity and policy, `providers` owns runtime/provider settings, and `docs` owns documentation settings;
- when root candidates exist they are selected, otherwise candidates under `DF_CONFIG_DIR` (default `.darkfactory`) are selected;
- two aliases in the selected scope, or candidates in both root and the configured folder, fail closed as ambiguous;
- separate candidate files are never silently merged;
- `.darkfactory` is a discovery fallback and is not a committed source in this repository;
- `.df` is a filename extension, never a directory.

### 7.2 Documentation configuration and output

The `docs` block in the combined configuration is the only DarkFactory documentation configuration contract.

Generated documentation sites and JSON content graphs are CI outputs and must not be committed. The deterministic `.agents/AGENTS.md` rules projection remains governed by the documentation currentness check.

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

Production GitHub interaction goes through the `Change/github/` binding; production shell/subprocess `gh` mutation is not allowed.

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

## 11. Identity

Identity is a first-class concern of the system and is not scoped to any caller. An identity is a
declaration plus one or more proofs. A proof is not restricted to a stored secret: it may be
stored, derived, or exist only for the duration of a flow. The system supports at minimum long-lived
bearer tokens, OAuth grants, mTLS client certificates, SSH keys, passkeys, time-based one-time
codes, codes delivered to another channel, and opaque session cookies.

Acquisition is part of the concern. An identity may be obtained through a flow that requires a
human or a second device — a login, a device code, a push approval, a code presented for entry —
so the system must not assume prior provisioning.

Custody is pluggable and may be split. Material may be held in OS-native secure storage, in an
encrypted fallback where supported, in a remote vault, or divided into shares across holders and
reassembled at the point of use. No single holder is authoritative when material is split.

Identity updates are transactionally serialized. Multi-file representations cannot expose a mixed generation after interruption. Replicated/synchronized secret state converges deterministically regardless of merge direction, represents deletion explicitly so removed secrets cannot be resurrected by stale replicas, and does not resolve equal-version conflicts by caller-local preference.

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

Everything else requests scoped identity handles. It does not directly inspect secret environment variables, credential files or OS keychains.

Secret values are never committed, written to issues/PRs, included in generated docs/static Pages assets or emitted in logs.

## 12. Human web authentication

Human/browser authentication is owned separately from machine identity and is reached through `Identity/`. It is distinct from a GitHub App installation authority.

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

`Surfaces/Docs/` is the final documentation engine and is a projection of the resolved system.

It compiles one typed content graph from:

- canonical Markdown documents under `.agents/`;
- ADRs and rules;
- actual TypeScript/TSDoc API extraction;
- capability-contributed documentation;
- repository/graph/workflow metadata;
- supported API extractors for other ecosystems.

TypeDoc may be used internally as the TypeScript/TSDoc extractor.

Documentation builds are deterministic, strict and zero-warning for required API surfaces.

`.agents/PRD.md` is the canonical product-documentation homepage. Root `README.md` is a symlink to this canonical product document; `.agents/AGENTS.md` is the deterministic generated projection of canonical `.agents/rules/**`, with ADR links derived from `.agents/adr/**`. CI fails when the generated projection drifts from its canonical directory or when rule↔note relations are incomplete or contradictory.

## 14. Renderer

`Surfaces/Renderer/` is the only first-party rendered interface.

It is a projection of one derived resolution and holds no per-feature implementation. Its feature
set, its option schema and its effect log are the same ones every other surface reads, so it
cannot present a capability, a setting or an outcome that another surface does not.

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

`Surfaces/Renderer/` is the primary day-to-day operator interface. Direct use of the GitHub UI is optional for normal DarkFactory operation except where GitHub itself requires a consent/review surface.

The web application is not a second state database or privileged mutation engine.

## 15. Terminal

`Surfaces/Terminal/` is the only first-party terminal surface, covering both the command line and
the interactive view. The supported command is `df`.

Like every surface it is a projection, so its command set is derived from the resolved system and
carries no per-feature implementation. It drives:

- CLI dispatch/help;
- wrapper/system-`df` coexistence;
- interactive TUI;
- web/operator command metadata where applicable.

Bare interactive `df` enters the TUI when appropriate. Headless commands remain scriptable.

Every surface consumes the same derived resolution. No surface holds a model, a state store or a capability
catalogue of its own, so none can present something another surface cannot.

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
- prebuilt `Surfaces/Renderer/` bundle.

Initial installation must not require Python, a source checkout or a pre-existing df installation.

Before a release-affecting delivery PR merges, an unpublished source-free candidate built from its exact head/tree must pass the applicable DarkFactory and consumer acceptance contract. Final publication occurs from canonical after merge without behavioral source changes; the published artifacts must reproduce the proven candidate behavior/assets aside from canonical source-provenance metadata.

The standard installation includes official capabilities while allowing third-party capabilities through the same loader.

## 17. Consuming df

A consumer is anything that runs released df: a repository, a machine, or a fleet of either. The
system does not enumerate or depend on a fixed set of them, and this document does not name
any.

Consumers receive released df and managed setup. They do not receive copied DarkFactory source
trees and do not rebuild the shared web application.

Capabilities handle project-specific setup wherever possible, including quality actions,
documentation, hooks, release and workflow configuration.

Install and update are idempotent and drift-aware: running them again on an already-current
consumer is a no-op, and running them on a drifted one reconciles it without discarding
consumer-specific declarations.

### 17.1 One model across repositories and machines

Machine-scoped and repository-scoped work must resolve through one semantic model rather than
a repository mode and a machine mode. A machine-scoped consumer is not a separate kind of
target; it is the same kind of target with a different scope.

- A capability behaves identically whether it is invoked in a working tree, on a host, or in CI. There are no per-location code paths and no host-only or repository-only capability variants.
- A declaration means the same thing in a repository and on a machine. Where a consumer's machine-level configuration is authored in a foreign declaration format, df resolves and composes it in that format (§5.1) rather than requiring it to be re-expressed.
- The boundary between repositories, machines and hosting types is not a place the system degrades. Support is stated as one behaviour, not as a matrix of what is known to work where, because a matrix is a standing promise to maintain and each per-location special case is a place an abstraction has leaked.
- Identifiers for repositories, machines, capabilities and providers are stable and comparable, so a declaration written for one target resolves correctly on another.

## 18. Security requirements

- No credential/token/private key in source, logs, issues, PRs, docs or Pages assets.
- Browser packages have enforced import boundaries from machine-secret code.
- Third-party capabilities receive only declared/scoped credential access.
- GitHub user authorization is not treated as GitHub App installation authority.
- History rewriting uses lease-safe expected-old-SHA semantics; blind force push is forbidden.
- Recovery never pushes secret-bearing local material.
- Authentication and authorization failures fail closed.

## 19. Final acceptance

DarkFactory is final only when the exact pre-merge candidate has passed the declared acceptance and consumer contract and the final canonical publication can reproduce it without behavioral source changes, and:

- df is the only normal production orchestration/mutation engine;
- production orchestration and mutation are owned by the final TypeScript df system;
- the §4 architecture is shipped and the tree is a restructure, not a parallel implementation;
- official capabilities are proven and reachable from every surface;
- identity custody and human-authentication boundaries are proven, across every supported proof type and
  acquisition flow, with split custody exercised rather than merely implemented;
- real TypeScript API docs are published;
- generated `.agents/AGENTS.md` is deterministic and current from canonical rules/ADRs; root `README.md` remains a symlink to the canonical product document;
- `Surfaces/Renderer/` is deployed to consumers without a frontend rebuild per consumer;
- the source-free pre-merge candidate installs/updates cleanly, and the canonical publication reproduces that behavior;
- the supported consumer set passes governance, detection, capability, docs/web, release-candidate and drift checks before the integration merge;
- `audit.df` is internally consistent;
- installed acceptance is green across the supported consumer set before merge;
- the declarable-graph product contract passes against the installed exact-head candidate and is re-smoked against the canonical publication.

### 19.1 Invariant acceptance

The thesis's invariants are not aspirations and are not satisfied by review. Each is a check that runs, and
DarkFactory is not final while any of them can fail:

- **I1 — no authored meaning.** A check rejects any file whose purpose is to enumerate what exists, and the
  count of sites where meaning is authored rather than derived is zero.
- **I2 — derivation is total.** A tree walk compares the derived feature set against the discovered set across
  overloads, re-exports and conditionals, and any asymmetry between what a surface shows and what the system
  can invoke fails the build.
- **I3 — the published interface is the code's own.** A feature with no doc comment is a build error, and each
  surface is checked to render the comment its feature publishes.
- **I4 — effects pass through a seam.** A check rejects direct filesystem, network and process access outside
  the seams. This is the precondition for the rest and is accepted first.
- **I5 — nothing is published uncompiled.** Every released artifact carries its resolution identity and is
  verified against it before publish.
- **I6 — discovery is structural.** A test adds a feature and asserts that no other file changed.
- **I7 — drift is measured against derivation.** Convergence is exercised against derived inputs only; a
  recorded copy of intent that can be compared instead of re-derivation fails the build.
- **I8 — the system is a fixed point.** The system compiled by itself resolves to itself, byte-identical, with
  no maintenance pass between.
- **I9 — presentation holds no behaviour.** A surface cannot be imported by a non-surface.

I4 and I8 are the two that are expensive to add later and cheap to require now, because both are structural:
once effects bypass the seams, nothing resting on them can be enforced, and once a second build description
exists, the fixed point stops being reachable at any price.

### 19.2 Self-hosting acceptance

Self-hosting is a claim with a completion condition, not a milestone. It is met when a change
to DarkFactory is proposed, interpreted, planned, implemented, reviewed, verified and merged
**by DarkFactory**, with humans approving rather than authoring.

Concretely, before the system can be called final:

- a real change to DarkFactory has been carried end to end by df — intake, Planning, implementation, review/fix to a fixed point, verification, governed merge and reconciliation — without a human authoring the change;
- the abstractions the system depends on are sufficient construction material for the system itself; a proposal that cannot be built by df is evidence the abstraction is wrong or the boundary is misplaced, not that the proposal should be hand-written;
- the bootstrap is named and accounted for: whatever executes the first systems-layer declaration is identified, and its removal path is stated. A seed that nothing else can rebuild is a permanent core outside the system's own guarantees;
- a capability's runtime surface is presented to an agent session rather than fixed, and an agent mutation is staged and reversible;
- removing the agent from a representative delivery leaves the delivery incomplete, demonstrating that the agent is an operator of the system's abstractions rather than a consumer of a fixed tool list.
