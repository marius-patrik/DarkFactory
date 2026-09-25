<!-- Generated from .agents/adr/** by @darkfactory/docs. Do not edit .agents/PRD.md directly. -->

# Product Requirements

# ADR-0006 — The pipeline runs only df

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-017`

## Decision

All model-backed pipeline execution goes through the `df` runtime.

- External coding-agent CLIs are not invoked directly by the production pipeline.
- Provider/account/model selection, credentials, quota handling, failover and execution are owned by df.
- CI and workflow orchestration call one DarkFactory runtime surface rather than provider-specific harnesses.

## Consequences

The production pipeline has one execution owner and one routing/credential/quota model. Provider-specific behavior is expressed through DarkFactory configuration and runtime interfaces.

---

# ADR-0008 — Providers are configuration-driven

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-017`

## Decision

Provider behavior is declared through configuration and generic dialect/runtime mechanisms.

Provider declarations cover endpoints, API dialect, authentication, credential slots, headers, model discovery and quota/error mapping. Provider-specific behavior does not get its own independent orchestration subsystem.

## Consequences

Adding or changing a provider is primarily a configuration/data change. Shared runtime mechanisms own transport, routing, authentication integration and failure handling.

---

# ADR-0009 — Accounts have named credential slots

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-016`

## Decision

DarkFactory models credentials as:

`provider → accounts[] → named credential slots`.

An account may contain multiple required values such as access token, refresh token, API key, organization/project identifier, cookie or custom header.

## Consequences

Routing and quota state can address accounts independently. Runtime adapters receive the selected account view without collapsing DarkFactory's full credential model.

---

# ADR-0011 — The quota engine is the availability authority

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-018`

## Decision

Provider/model/account availability is determined by DarkFactory's quota engine.

The engine combines declared limits with observed response headers, usage data, errors and provider usage endpoints. Routing does not spend requests merely to probe availability.

Capacity admission is authoritative state, not an advisory preflight. Concurrent model calls reserve request/token/concurrency capacity atomically before dispatch and settle or release that reservation from observed usage. Corrupt or unreadable authoritative quota state fails closed rather than being interpreted as empty usage.

## Consequences

All routing and operator status surfaces consume one availability model. Quota accounting is shared across processes and supports deterministic wait/skip/failover behavior without concurrent calls consuming the same remaining capacity.

---

# ADR-0012 — Routing is limit-aware and capability-tiered

**Status**: Accepted

**Related rules**: `DF-RULE-014`

## Decision

The router selects candidates using task kind, required capabilities, context, sensitivity/data policy, live quota and configured capability tiers.

- Provider eligibility is evaluated before model strength.
- The lowest sufficient capability tier is preferred.
- Failure escalation moves deterministically to a stronger eligible tier.
- Explicit graph/CLI routing remains an override subject to hard eligibility/capacity constraints.

## Consequences

Lightweight models can serve appropriate work without consuming scarce high-capability capacity, while sensitive and capability-constrained work still fails closed.

---

# ADR-0013 — df runs the workflow graph

**Status**: Accepted

**Related rules**: `DF-RULE-010`, `DF-RULE-011`, `DF-RULE-012`, `DF-RULE-013`, `DF-RULE-014`, `DF-RULE-018`

## Decision

DarkFactory executes delivery as a declarative graph of agent, gate, automation and check-reference nodes with explicit edges and loop semantics.

Planning, implementation, review/fix, alignment and deterministic effects are orchestrated by the graph/runtime. Static CI checks may remain external and are observed through check-reference nodes.

Execution is serializable per durable run identity. Concurrent ingress for the same run cannot execute the same transition concurrently or overwrite a newer persisted transition. External effects are separately serialized by deterministic effect identity and reconciled after ambiguous interruption.

## Consequences

Execution state is durable and resumable. Workflow topology has one declarative source rather than duplicated script orchestration, and duplicate/out-of-order ingress cannot create duplicate logical mutations.

---

# ADR-0015 — The engine owns deterministic steps

**Status**: Accepted

**Related rules**: `DF-RULE-007`, `DF-RULE-018`

## Decision

DarkFactory owns deterministic workspace and delivery effects, including repository state inspection, checkout/update operations, scope verification, commits, pushes, pull-request operations and deterministic verification.

Models perform judgement and file edits. Natural model stop is valid completion. Code-result truth is derived from observed workspace/effect state; judgement results may be structurally extracted after the model stops.

Remote mutation uses observed evidence and conditional semantics. Git pushes identify the expected old remote SHA and the new local SHA, refuse stale remote state and verify the resulting ref. Ambiguous write outcomes are reconciled before retry rather than blindly replayed.

## Consequences

Models are not required to print control JSON, perform git operations or submit completion tools. Mutation and completion claims are backed by observed effects, and deterministic retries cannot silently duplicate or overwrite newer external state.

---

# ADR-0016 — Model resolution is live

**Status**: Accepted

**Related rules**: `DF-RULE-014`

## Decision

DarkFactory discovers usable models from configured provider catalogs/accounts at runtime.

Provider configuration contains the minimum information required to reach and authenticate to the provider. Routing uses live/cached catalog state plus quota/runtime outcomes rather than depending on hand-maintained model inventories.

## Consequences

Model availability can change without editing routing source. Invalid or unavailable models fall out of eligibility through the shared catalog/quota mechanisms.

---

# ADR-0017 — Modular packages and first-class capabilities

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-017`

## Decision

DarkFactory is a root Bun workspace with stable first-party package boundaries:

- `@darkfactory/protocol`
- `@darkfactory/core`
- `@darkfactory/capability`
- `@darkfactory/github`
- `@darkfactory/keychain`
- `@darkfactory/auth`
- `@darkfactory/docs`
- `@darkfactory/cli`
- `@darkfactory/web`

Agentic/product behavior is implemented as versioned capabilities under root `capabilities/`. Core owns execution mechanisms; capabilities own behavior.

Each concern has one final implementation owner. Final packages do not forward implementation to a deletion-bound legacy tree, and duplicate internal registries/state/config/command owners are not maintained for migration convenience.

## Consequences

Package dependencies remain acyclic and browser-safe boundaries are explicit. Official and third-party capabilities use the same ABI/loader. No monolithic harness package is part of the public architecture, and internal historical architecture is not a compatibility surface.

---

# ADR-0019 — GitHub backs the web control plane

**Status**: Accepted

**Related rules**: `DF-RULE-009`, `DF-RULE-011`, `DF-RULE-016`, `DF-RULE-018`

## Decision

DarkFactory Web uses GitHub as the durable issue/PR/check/project/event/authorization control plane.

The browser application reads live GitHub state through browser-safe GitHub/auth interfaces. Human-attributed actions use the authenticated GitHub user; privileged automation uses the DarkFactory GitHub App identity.

Webhook/workflow events are triggers, not authoritative state snapshots. Reconciliation derives desired status, bindings and project state from current GitHub/runtime evidence so delayed or out-of-order events are idempotent and cannot roll newer state backward.

## Consequences

The web application does not maintain a second project database or privileged mutation backend. Consumer Pages deployments reuse the shared application and repository-specific compiled content/data, while reconciliation remains current-state driven rather than event-order driven.

---

# ADR-0020 — Browser auth and machine keychain are separate trust boundaries

**Status**: Accepted

**Related rules**: `DF-RULE-016`, `DF-RULE-018`

## Decision

`@darkfactory/keychain` owns machine credentials, provider accounts, token refresh, secure storage and GitHub App machine identity.

`@darkfactory/auth` owns human/browser GitHub authentication and session management.

Browser-safe packages cannot import machine-secret/private-key implementations.

Credential/account updates are transactionally serialized. Multi-file logical credential state cannot expose mixed generations after interruption. Replicated vault state converges deterministically, represents deletion explicitly until safe compaction, and does not resolve equal-version conflicts by caller-local preference. Browser-session refresh/revoke also uses atomic state transitions so rotating refresh tokens cannot race a concurrent revocation.

## Consequences

Human authorization and machine automation authority remain distinct. Secret-bearing machine state never enters static/browser artifacts, and concurrent/replicated credential operations converge without resurrecting stale secrets.

---

# ADR-0021 — Repository declarations, runtime detection and capability-resolved actions

**Status**: Accepted

**Related rules**: `DF-RULE-003`, `DF-RULE-006`, `DF-RULE-015`

## Decision

- Canonical root `repo.dfconfig` owns one combined configuration document; root `config.dfconfig` and root `.dfconfig` are accepted aliases for that same document.
- The `repo` block is the repository/product declaration, `providers` is runtime/user/provider configuration, and `docs` is documentation configuration.
- Consumers select only their named block from the selected document.
- `DF_CONFIG_DIR` (default `.darkfactory`) is a supported fallback discovery folder, but `.darkfactory` is not a committed source in this repository.
- Root and folder candidates may not coexist, aliases may not coexist in one scope, and separate files are never silently merged.
- Repository/package/ecosystem/domain evidence is detected by the TypeScript runtime.
- Versioned capabilities resolve applicable test, typecheck, lint, format, docs, setup and release actions.
- Domain and capability are separate axes.
- Repository identity, taxonomy and non-detectable policy are data, not hard-coded source.
- The canonical/default branch is discovered from repository state/configuration.
- Detection and action resolution fail closed on malformed/unreadable declared evidence, unknown explicit declarations, ambiguous ownership and missing required quality actions.
- Every first-party package/capability is covered exactly once by an owning action or an explicit justified workspace-level/not-applicable declaration.

## Consequences

Repository behavior is determined by current declarations plus detected evidence and capability resolution. The final runtime has one strict configuration/detection model, and a green quality result proves complete resolved coverage rather than silently skipping unsupported packages/actions.

---

# ADR-0022 — Complete the final system directly

**Status**: Accepted

**Related rules**: `DF-RULE-003`, `DF-RULE-013`, `DF-RULE-017`, `DF-RULE-019`

## Decision

DarkFactory implementation targets the final architecture directly.

- Missing behavior is implemented in its final TypeScript package/capability owner.
- Useful existing TypeScript is moved/reused rather than rewritten solely to change ownership.
- Duplicate production implementations are not maintained in parallel.
- Internal backward-compatibility, migration, parity, shadow, canary, fallback and alias layers are forbidden unless an external supported contract explicitly required by `.agents/PRD.md` needs them.
- Previous internal architecture is not a compatibility target and is never kept "just in case".
- Dead/unreachable code, stale configuration, unused assets, obsolete tests, superseded docs and transitional adapters are deleted rather than documented or tested into permanence.
- Shared mechanisms are abstracted once at the lowest stable owner when repetition represents the same invariant; speculative abstraction and API widening solely for tests are avoided.
- Legacy DarkFactory Python and deletion-bound harness ownership are removed once their required behavior is represented by final owners; they are not maintained as parity/fallback paths.
- Independent final-product work proceeds concurrently whenever consumed interfaces are stable.
- Tightly coupled final completion work may be consolidated into one owner-approved Request/Planning record and one integration PR instead of being artificially split into child delivery PRs.
- Before that final integration PR merges, an unpublished source-free release candidate built from its exact head/tree is validated through the complete DarkFactory acceptance and declared consumer-fleet acceptance.
- Known defects found by exact-head/fleet acceptance are fixed on the integration branch and re-proven before merge.
- Final supported publication occurs from canonical after merge without introducing behavioral source changes; publication must reproduce the proven candidate behavior/assets aside from canonical provenance metadata.

## Consequences

Completion sequencing is optimized for the shortest safe path to one final, proven merge. The repository remains current-only and small: unsupported internal history lives in Git/issues rather than compatibility code, and fleet defects cannot be deferred into a post-merge stabilization phase.

---

# ADR-0023 — First-party docs use the combined docs block and one renderer

**Status**: Accepted

**Related rules**: `DF-RULE-002`, `DF-RULE-003`

## Decision

- `@darkfactory/docs` is the headless documentation compiler/content-graph owner.
- The `docs` block of the combined DarkFactory configuration is the only documentation configuration contract.
- The compiler builds one typed content graph from canonical Markdown, ADRs/rules, TypeScript/TSDoc API extraction, capability-contributed documentation and repository/graph/workflow metadata.
- TypeDoc may be used internally as the TypeScript/TSDoc extractor.
- `@darkfactory/web` is the only first-party web renderer.
- `.agents/PRD.md` is the product homepage. `.agents/rules/**` and `.agents/adr/**` are canonical. Root `README.md` is a symlink to the canonical product document; `.agents/AGENTS.md` is the deterministic generated projection of canonical rules. Supported discovery aliases may point to canonical documents or generated projections, but internal legacy aliases are not retained.
- Consumer repositories use the released web bundle plus repository-specific compiled content/data; generated sites and JSON content graphs remain CI outputs rather than committed sources.

## Consequences

Documentation has one compiler/configuration contract and one first-party renderer while product docs, rules and long-term notes retain distinct canonical sources and generated discovery projections.

---

# ADR-0024 — Effects are serializable and authoritative state is crash-consistent

**Status**: Accepted

**Related rules**: `DF-RULE-018`

## Decision

DarkFactory correctness is defined across duplicate delivery, concurrent execution, interruption and ambiguous external-write outcomes.

- Authoritative transitions serialize at the identity they mutate: run, effect, account, branch/worktree, quota reservation, release and other durable state.
- Check-then-act is insufficient without an atomic claim, lease, transaction or compare-and-set.
- A deterministic effect identity produces at most one logical external mutation, including concurrent duplicate invocation.
- After an ambiguous non-idempotent write outcome, DarkFactory reconciles current external state before retrying.
- Remote mutation uses expected-old-version/SHA semantics where available and fails closed on stale state.
- Multi-file logical state commits through one generation/transaction boundary.
- Lock recovery cannot remove another owner's replacement lock.
- Replicated state converges independent of merge direction and represents deletion until stale replicas can no longer resurrect it.
- Concurrency/idempotency/atomicity claims are tested with simultaneous actors and injected failures at real durable boundaries, not only sequential replay after success.

## Consequences

Crash recovery and concurrency safety are one protocol rather than separate best-effort features. Advisory telemetry may use weaker durability only when it cannot authorize work, affect mutation truth, consume capacity authority or change reconciliation decisions.

---

# ADR-0025 — Each delivery branch has one integration authority

**Status**: Accepted

**Related rules**: `DF-RULE-005`, `DF-RULE-007`, `DF-RULE-019`

## Decision

Parallel implementation uses one authoritative remote delivery branch writer.

- The orchestrator alone advances the authoritative delivery branch and owns integration.
- Parallel workers use isolated local worktrees/branches with explicit prerequisites and disjoint subsystem/path ownership.
- Workers return coherent commits, changed-file sets, targeted verification and assumptions; they do not mutate the authoritative remote branch.
- Shared integration surfaces remain orchestrator-owned unless one non-overlapping edit is explicitly delegated.
- Dependent work begins only after its consumed interface is integrated and verified.
- CI is read-only on delivery branches.
- Each implementation gate records exact-head evidence before downstream work treats it as satisfied.
- Coherent commit boundaries are preserved; one PR does not imply one opaque squash commit.

## Consequences

Parallelism improves throughput without introducing lost updates, shared-file races or evidence attached to obsolete heads. Integration authority may be transferred explicitly, but there is never more than one active authority for one delivery branch.

---

# ADR-0026 — Verification proves invariants and fails closed

**Status**: Accepted

**Related rules**: `DF-RULE-001`, `DF-RULE-006`, `DF-RULE-008`

## Decision

Tests and CI prove product/architecture invariants rather than freezing incidental repository shape.

- Behavioral tests live at the owning package/capability boundary and survive valid refactors.
- Static tests inspect semantic structure—parsed declarations/workflows, schemas, import/dependency graphs, public exports or generated artifacts—when static structure is the actual contract.
- Exact filenames, source substrings, internal symbol names and workflow step labels are not normally product invariants.
- Duplicate/shadowed tests are invalid verification.
- Concurrency/idempotency/atomicity tests exercise simultaneous actors and crash/failure windows.
- Typecheck is a first-class TypeScript quality action.
- CI fails closed on missing, unsupported, ambiguous or stale required quality actions and accounts for every detected first-party package/capability exactly once.
- Required skipped/neutral/missing/stale checks are not treated as proven success unless they were explicitly declared not applicable before matrix construction.
- CI validates but does not mutate delivery branches; deterministic formatting/fixes happen before the governed commit.
- Release proof executes the built/source-free candidate rather than substituting source-workspace imports.

## Consequences

A green head means the declared invariants were actually evaluated. The suite remains useful during aggressive cleanup because it protects behavior and architecture rather than stale implementation text.

---

# ADR-0027 — Repository-authored artifacts use English

**Status**: Accepted

**Related rules**: `DF-RULE-004`

## Decision

Repository-authored code, identifiers, comments, docstrings, commit messages, issues, pull-request text and documentation use English as the common written language.

Quoted verbatim user input and fixtures/content whose meaning depends on another language are explicit exceptions.

Machine enforcement is limited to surfaces that can be checked deterministically. Natural-language prose remains a review invariant rather than being protected by a brittle heuristic language detector.

## Consequences

Human and agent contributors share one review language across source, GitHub and generated documentation without pretending that unreliable natural-language classification is a correctness gate.
