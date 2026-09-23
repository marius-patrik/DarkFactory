# Repository Development Guidelines & Agent Rules

DarkFactory is developed by an autonomous agent pipeline under human approval gates. The rules
below are canonical in `.agents/rules/` and binding on every contributor — human or agent.
They are binding regardless of enforcement mechanism. CI, branch protection and tests enforce the portions already automated. This file is a
projection of those canonical files: it carries the normative requirement text of every rule and an
index back to each canonical file for rationale and enforcement. Related notes are derived from
accepted ADR metadata; edit canonical rules/notes rather than this projection.

## Index

| ID | Rule | Related notes | Canonical file |
|---|---|---|---|
| `DF-RULE-001` | Tests prove invariants | `ADR-0026` | `.agents/rules/001-unit-tests.md` |
| `DF-RULE-002` | Inline docstrings and generated documentation | `ADR-0023` | `.agents/rules/002-inline-docs-and-generated-documentation.md` |
| `DF-RULE-003` | Product requirements and ADRs | `ADR-0021`, `ADR-0022` | `.agents/rules/003-product-requirements-and-adrs.md` |
| `DF-RULE-004` | English language consistency | `ADR-0027` | `.agents/rules/004-english-language.md` |
| `DF-RULE-005` | Commit granularity | `ADR-0025` | `.agents/rules/005-commit-granularity.md` |
| `DF-RULE-006` | CI readiness | `ADR-0021`, `ADR-0026` | `.agents/rules/006-ci-readiness.md` |
| `DF-RULE-007` | Branches and pull requests | `ADR-0015`, `ADR-0025` | `.agents/rules/007-branches-and-pull-requests.md` |
| `DF-RULE-008` | Formatting and linting | `ADR-0026` | `.agents/rules/008-formatting-and-linting.md` |
| `DF-RULE-009` | Issue binding, branch auto-deletion, and board status | `ADR-0019` | `.agents/rules/009-issue-binding-and-board-status.md` |
| `DF-RULE-010` | Approved delivery plan | `ADR-0013` | `.agents/rules/010-approved-delivery-plan.md` |
| `DF-RULE-011` | Review approval and auto-merge | `ADR-0013`, `ADR-0019` | `.agents/rules/011-review-approval-and-auto-merge.md` |
| `DF-RULE-012` | Request capture and confirmation | `ADR-0013` | `.agents/rules/012-request-capture-and-confirmation.md` |
| `DF-RULE-013` | Specification and work tracking | `ADR-0013`, `ADR-0022` | `.agents/rules/013-specification-and-work-tracking.md` |
| `DF-RULE-014` | Agent runtime and resilience | `ADR-0006`, `ADR-0008`, `ADR-0009`, `ADR-0011`, `ADR-0012`, `ADR-0013`, `ADR-0016`, `ADR-0017` | `.agents/rules/014-agent-runtime-and-resilience.md` |
| `DF-RULE-015` | Repository taxonomy | `ADR-0021` | `.agents/rules/015-repository-taxonomy.md` |
| `DF-RULE-016` | Security and secrets | `ADR-0009`, `ADR-0019`, `ADR-0020` | `.agents/rules/016-security-and-secrets.md` |
| `DF-RULE-017` | Final architecture, DRY, and deletion | `ADR-0006`, `ADR-0008`, `ADR-0017`, `ADR-0022` | `.agents/rules/017-final-architecture-dry-and-deletion.md` |
| `DF-RULE-018` | Concurrency, atomicity, and idempotency | `ADR-0011`, `ADR-0013`, `ADR-0015`, `ADR-0019`, `ADR-0020`, `ADR-0024` | `.agents/rules/018-concurrency-atomicity-and-idempotency.md` |
| `DF-RULE-019` | Orchestrated integration and worker isolation | `ADR-0022`, `ADR-0025` | `.agents/rules/019-orchestrated-integration-and-worker-isolation.md` |


---

### Rule 1 — Tests prove invariants

Every behavior or contract change MUST be covered at the owning package/capability boundary by tests
that prove observable invariants, state transitions, failure behavior or integration contracts.

Tests MUST survive valid refactors. They must not normally assert exact implementation filenames,
source-code substrings, function/class names, workflow step labels, copied command text, or the
presence/absence of an internal file merely because the current implementation happens to use it.

Static architecture/governance tests are appropriate only for real static contracts. They MUST inspect
semantic structure where practical: parsed manifests/configuration/YAML, schemas, dependency/import
graphs, package exports, generated artifacts or public interfaces rather than brittle source grep.

Concurrency-sensitive behavior MUST be tested concurrently. Idempotency/crash-safety claims MUST
exercise duplicate invocation and the relevant crash window, not only call the same function twice
after a successful journal write. Atomicity claims MUST test interruption/failure between transaction
steps.

Each final first-party package/capability MUST own or be explicitly covered by one canonical detected
test action. Coverage that happens only because a legacy aggregate/harness test imports the package is
not sufficient. Duplicate/shadowed test definitions and copied test blocks are forbidden.

Applicable test actions come from the canonical repository/package detection plus
capability-resolution contract. All applicable suites MUST pass before a head is considered green.

### Rule 2 — Inline documentation and generated documentation

Public source APIs MUST be documented inline.

- **TypeScript**: TSDoc on every exported public symbol in first-party packages and capabilities.
- **Rust**: `///` documentation on public items, including error/panic behavior where applicable.
- **Python**: any retained Python tooling exposes typed Google-style docstrings on public helpers.

Documentation MUST be generated from canonical source and architecture records. DarkFactory's documentation engine is `@darkfactory/docs`; TypeDoc may be used internally for TypeScript extraction. `docs.df` is the only DarkFactory documentation configuration contract.

`docs/home.md` is the product-documentation homepage. `AGENTS.md` is the generated/indexed projection of canonical `.agents/rules/**`. Root `README.md` is the generated index/projection of current long-term `.agents/notes/**`. These surfaces have distinct roles and MUST NOT duplicate one another. CI MUST fail on deterministic projection drift.

The final web rendering layer is `@darkfactory/web`; docs must not maintain a second frontend or theme runtime.

### Rule 3 — Product requirements and ADRs

`PRD.md` is the single normative product requirements document. Current active Request/Planning records define approved feature-specific behavior and executable delivery scope. Accepted ADRs record durable architectural decisions and rationale.

Executable declarations use the final DarkFactory contracts:

- `repo.df` for repository/product declaration;
- `config.df` for runtime/user/provider configuration;
- `docs.df` for native documentation configuration;
- the declarable workflow graph for execution topology;
- `.agents/rules/*.md` for mandatory contribution/governance behavior.

Only the current `repo.df`, `config.df`, and `docs.df` contracts are normative.

A material deviation from PRD MUST be owner-approved and recorded as an accepted numbered ADR before implementation.

Long-term notes and normative rules form one bidirectional current-truth graph:

- every accepted ADR MUST declare the canonical rules it explains or constrains;
- every canonical rule MUST be backed by at least one current accepted ADR explaining its durable rationale;
- unknown, missing or orphaned links are documentation-currentness failures;
- superseded/historical decisions are removed from the live notes/rules graph and remain in Git/GitHub history instead.

### Rule 4 — English language consistency

All code, identifiers, comments, docstrings, commit messages, issues, and documentation MUST be
written in English.

### Rule 5 — Commit granularity

Keep commits modular, focused, and descriptive — one commit per component or coherent change. A
single delivery PR may contain multiple coherent commits; one PR does not imply one commit. When an
integration/orchestrator session combines parallel worker output, preserve coherent commit boundaries
until the final merge rather than collapsing unrelated work into one opaque commit.

All commits across all branches MUST follow the Conventional Commits format
`<type>(<scope>): <description>` (e.g. `feat(core): add substrate bus frame codec`). The allowed
types and the area taxonomy are defined by DF-RULE-015; this rule covers granularity only.

### Rule 6 — CI readiness and verification

The canonical/default branch MUST remain green on its required checks. A red canonical branch is a
stop-the-line event for repository-wide delivery until restored.

A failing topic/recovery branch blocks that branch's merge and any dependent work, but does not
globally halt unrelated isolated branches whose own required checks are green.

CI MUST derive one normalized quality contract from detected packages plus applicable capabilities
and fail closed when that contract has an unresolved required gap, ambiguity or unsupported action.
Warnings are not an acceptable substitute for required test, typecheck, lint, format or documentation
coverage.

Type safety is a first-class required quality action for TypeScript packages. Every detected
first-party package/capability MUST be accounted for exactly once by an owning package action or an
explicit workspace-level action whose coverage can be proven. Incidental execution through a legacy
aggregate package does not count.

The aggregate required quality check is green only when every applicable required action for the
current head completed successfully. A required action that is missing, stale, cancelled, skipped or
neutral is not treated as proven success unless canonical configuration explicitly marks that action
not applicable before matrix construction.

CI validation MUST be read-only with respect to the delivery branch. Formatting and other
deterministic fixes happen in the governed mutation path before commit; CI reports drift rather than
pushing corrective commits.

Required checks are synchronized with branch protection and evaluated for the exact current head. A
branch may not merge while any required check or required invariant is red, missing, stale or
unevaluated.

### Rule 7 — Branch and pull request workflow

All normal product changes MUST use dedicated delivery branches and GitHub pull requests. Direct
mutation of the protected canonical branch is prohibited outside an explicitly authorized
bootstrap/emergency operation recorded by the active Request/Planning record.

- Branch names are lowercase, descriptive and do not depend on issue numbers.
- The repository's actual canonical/default branch is resolved dynamically; `main` is never assumed.
- Automation-authored PRs use the canonical DarkFactory GitHub App/bot identity so the human maintainer can independently review them.
- PRs remain draft while implementation/review is active and become merge-ready only through the governed gate.
- Required checks and current-base requirements must pass before merge.
- Branch protection remains enabled with the final detected/generated check contract.
- Rewrites/pushes use deterministic git owners and lease-safe expected-old-SHA semantics; blind force push is forbidden.

### Rule 8 — Automated formatting and linting

Formatting is deterministic automation, not a review topic.

The canonical detection + capability-resolution contract determines the formatter/linter for each detected package/ecosystem. First-party TypeScript workspace packages use the canonical Biome configuration; other ecosystems use their declared/detected capability actions.

Formatting/linting commands MUST be derived from the same normalized package/capability result used by local verification and CI. Do not maintain a second workflow-specific command map.

The mutation path applies deterministic formatting before creating a commit. CI validates the resulting tree but MUST NOT asynchronously create/push formatter commits that advance an active delivery branch after the orchestrator has integrated or proven a head.

Lints are blocking where supported. Generated artifacts are excluded only by explicit canonical policy.

### Rule 9 — Request binding, branch cleanup and board status

Every delivery PR MUST explicitly bind every **active** Request it satisfies.

A PR may satisfy one Request or multiple Requests when the shared-Planning/multi-Request model proves
that every active bound Request has valid Planning/gate coverage. Epic membership or stack topology
never implies completion by itself.

When the owner deliberately consolidates tightly coupled work into one current Request, the
consolidated Request MUST first preserve the current required behavior and relevant verbatim owner
direction. Earlier duplicate Requests are then closed as historical traceability and do not need to
remain separately bound by the delivery PR.

Failures already associated with a delivery PR/Request MUST be recorded as check/run evidence and on
that bound work rather than creating a new implementation Request. A standalone unbound/default-branch
operational failure may use one deduplicated incident record when durable follow-up is required.

Merged delivery branches are cleaned up when safe. A branch with unique unrepresented recovery/stack
work is not deleted merely because another PR merged.

Request/PR/project status uses one canonical reconciliation model with the seven states:

- `Backlog`
- `ToDo`
- `In Progress`
- `Blocked`
- `Done`
- `Superseded`
- `Dropped`

A Request reaches Done only from its own terminal evidence or explicit valid shared-Planning/
multi-Request completion.

Webhook/event payloads are triggers, not authoritative lifecycle snapshots. Before mutating status,
labels, project fields, PR bindings or branch cleanup, reconciliation MUST derive the desired state
from current GitHub/runtime evidence. Delayed or out-of-order events must be idempotent and must not
roll a newer status backward.

### Rule 10 — Reviewed Planning and implementation alignment

Before implementation begins, each governed unit of work MUST have one current unified Planning
artifact.

Planning contains the semantic interpretation of the verbatim Request plus the evidence-justified
implementation approach, dependencies, recovery inputs and verification expectations.

Planning MUST pass an independent review/fix loop until clean, followed by one explicit owner
Planning Approval.

There is no separate interpretation approval gate and plan approval gate in the final lifecycle.

After implementation:

- deterministic verification runs;
- implementation review/fix loops until clean;
- material scope outside approved Planning requires the lighter scope-amendment approval;
- final alignment validates the implementation against approved Planning plus approved amendments;
- required checks/review/merge gates remain mandatory.

Planning approval becomes stale after a material Request/base/dependency/recovery-context change and
cannot be silently reused.

If the governed Planning implementation itself is unavailable or is the component being repaired,
only the narrow bootstrap/completion exception below may substitute an owner-authorized tracked
Request as the temporary Planning record.

### Rule 11 — Pull request review approval and governed merge

Pull requests require the final repository protection/review contract before merge.

Native GitHub review approval and the canonical authorized DarkFactory approval command grammar are both valid only when the current actor is authorized. Free-text that merely resembles approval cannot advance a gate.

Merge readiness requires:

- current-base/stack validity;
- required checks green;
- implementation review/fix clean;
- final Planning alignment;
- any required scope-amendment approval;
- official final review/merge authorization.

After merge, df deterministically reconciles bound Requests/PRs/project state and safe branch cleanup.

### Rule 12 — Verbatim Request capture and Planning gate

Every incoming governed task MUST be represented by one or more tracked GitHub Requests before
implementation.

- Preserve the user's verbatim wording.
- Decompose genuinely independent tasks; do not split tightly coupled architecture solely to satisfy one-PR/one-issue assumptions.
- When the owner consolidates previously separate Requests into one current Request, copy the relevant verbatim owner direction and all still-current required behavior into the consolidated Request before closing duplicates.
- Resolve Request/Epic/dependency/recovery relationships explicitly.
- Generate one unified Planning artifact from the verbatim Request and authoritative context.
- Independently review/fix Planning until clean.
- Require one explicit owner Planning Approval before implementation.
- Subsequent delivery remains bound to the active Request(s) or an explicitly approved shared-Planning record.

There is no final separate `Interpretation` section/gate that must be approved before Planning can
exist.

### Rule 13 — Specification sequence and work tracking

Specification proceeds in one direction, and each stage is settled before implementation depends on
it:

```text
PRD.md  →  accepted ADRs when a durable architecture decision is required  →  Request/Planning
```

- **Issues track settled intent and executable work, not unresolved architecture debates.** An issue
  may be filed when its required outcome is settled by the PRD/accepted ADRs or when it is a concrete
  mechanical task whose outcome is not in question.
- **Open architecture questions stay with the owning product/ADR decision until settled.** Do not
  create speculative decision issues merely to move an unresolved argument into the tracker.
- **Decomposition follows delivery independence, not size alone.** A large tightly coupled body of
  settled work may remain one Request/Planning record and one delivery PR when the owner explicitly
  chooses one coherent integration/validation contract. Do not manufacture child Requests merely to
  satisfy a process shape.
- **Use an Epic when genuinely independent child Requests benefit from separate lifecycle,
  ownership, sequencing or delivery.** Epic relationships organize Requests; they are not mandatory
  wrappers around every large change and never waive child Planning/evidence when children exist.
- `PLAN.md` may record repository-wide strategy and dependency order, but it is not a second live
  work ledger. Concrete current implementation steps, checkboxes, approvals and evidence live in the
  active Request/Planning record plus the workflow graph/GitHub/project state.

### Rule 14 — Capability-driven agent runtime and resilience

DarkFactory runs agentic work through the TypeScript df runtime, not a final Python harness registry.

- Core owns execution, routing primitives and persistence/resume; `@darkfactory/capability` owns capability discovery/loading/resolution.
- Agentic/product behaviors are versioned capabilities.
- One canonical capability implementation may generate native Pi, MCP and supported agent skill/plugin adapters.
- Pipeline stages pass explicit task kind where known; undeclared inference separates subject from required capability.
- Provider/account/model selection respects sensitivity, data-collection policy, capability requirements, quotas and capability tiers.
- Exhaustion/failure moves through the configured eligible failover chain without repeating deterministic effects.
- Every logical agent stage has one bounded elapsed-time budget across model failover and tools.
- Natural model stop is accepted; mutation truth comes from observed effects.
- Quota/provider interruption checkpoints durable state and resumes without duplicating completed effects.
- CI agent execution remains containerizable/non-root.

### Rule 15 — Commits, repository taxonomy and domains

Commits use Conventional Commits: `<type>(<scope>): <description>`.

Allowed base types are `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, and `ci`.

Repository area labels/scopes are declared by `repo.df`.

Project classification separates:

- ecosystem/toolchain;
- package;
- semantic domain (initially including code, paper and math);
- capability.

A repository may contain multiple packages, ecosystems and domains. Capabilities are orthogonal and may apply across domains.

Request classification, commit-scope validation and repository labels consume the same declared taxonomy rather than copied lists.

### Rule 16 — Security, authentication and secrets

No credential, access token, refresh token, cookie, client secret or private key may be committed, logged, written to issues/PRs, included in generated docs or embedded in static web assets.

`@darkfactory/keychain` is the sole machine/harness credential-custody owner. Other packages/capabilities declare credential requirements and receive scoped access; they do not read raw credential files, secret environment variables or OS keychains directly.

`@darkfactory/auth` separately owns human/browser GitHub App authentication and sessions. Browser bundles cannot import keychain/private-key/server-confidential code.

The web auth broker may hold only credentials required for confidential user-token exchange/refresh and is not a DarkFactory state/execution backend.

GitHub user authority and GitHub App installation authority remain distinct.

Secret-bearing recovery material remains preserved locally and blocked from publication rather than leaked or discarded.


### Rule 17 — Final architecture, DRY, and deletion

The repository targets the current final architecture directly.

- Every concern has one final owner and one source of truth. Duplicate implementations, registries,
  state stores, config contracts, command maps and generated/manual copies are forbidden.
- Reuse or move working code when it already implements the required behavior, but delete its old
  owner once the final owner is live. Final packages MUST NOT forward implementation to a
  deletion-bound/legacy tree.
- Internal backward-compatibility, migration, parity, shadow, canary, fallback and alias layers are
  forbidden unless an **external supported contract explicitly required by PRD.md** needs them.
  Previous internal architecture is never a compatibility target and is not preserved "just in case".
- Delete unreachable/dead code, stale configuration, unused assets, obsolete tests, superseded docs,
  abandoned feature flags and transitional adapters instead of documenting or testing their presence.
- Abstract repeated mechanisms and invariants once at the lowest stable owner. Do not create
  speculative abstractions for one caller or hide unrelated behavior behind a generic helper merely
  to reduce line count.
- Public exports are intentional product/extension contracts. Keep internal helpers private; tests do
  not justify widening an API.
- Package/capability dependencies remain explicit and acyclic. Historical implementation belongs in
  Git/issues, not live source.

### Rule 18 — Concurrency, atomicity, and idempotency

Authoritative state and external effects MUST remain correct under duplicate delivery, concurrent
execution, interruption and ambiguous transport failure.

- Serialize authoritative transitions at the identity they mutate (run, effect, account, branch,
  worktree, quota reservation, release, etc.). Check-then-act without an atomic claim/lease/CAS is not
  sufficient.
- A deterministic external effect ID may produce at most one logical mutation. Concurrent duplicates
  cannot both enter the mutation; crash recovery reconciles observed external state before retrying.
- Remote writes use expected-old-version/SHA or equivalent conditional semantics and fail closed on
  stale state.
- Mutation retries are method/effect aware. After an ambiguous write outcome, reconcile first; never
  blindly replay a non-idempotent POST/write because a transport or 5xx response failed.
- Authoritative file/state updates are crash-consistent. Multi-file logical state uses one
  generation/transaction boundary; lock recovery cannot delete a replacement owner's lock.
- Replicated state converges deterministically regardless of merge direction and represents deletion
  explicitly until it is safe to compact.
- Quota/capacity is reserved atomically before concurrent work is dispatched and settled from observed
  usage.
- Webhook/events are triggers, not authoritative snapshots; reconciliation derives desired state from
  current evidence so stale/out-of-order events cannot roll state backward.
- Concurrency, idempotency and atomicity claims are tested at the actual race/crash windows with
  simultaneous actors and fault injection.

### Rule 19 — Orchestrated integration and worker isolation

Parallel implementation has one integration authority per delivery branch.

- The orchestrator alone advances the authoritative remote delivery branch and owns integration.
- Parallel workers use isolated local worktrees/branches with explicit prerequisites and disjoint
  subsystem/path ownership. They do not create competing remote delivery branches/PRs or mutate the
  integration branch.
- Shared integration surfaces (root manifests/lockfiles, package export maps, workflow/config,
  PRD/PLAN/rules/docs and generated projections) stay orchestrator-owned unless one non-overlapping
  edit is explicitly delegated.
- Workers return a coherent commit SHA, changed-file set, targeted verification and assumptions.
  The orchestrator integrates those commits in dependency order, resolves shared files semantically
  and re-runs affected gates.
- A dependent lane starts only after the interface it consumes is integrated and verified on the
  authoritative branch. Do not parallelize across unsettled shared interfaces.
- Keep coherent Conventional Commit boundaries. One delivery PR does not justify one opaque commit.
- CI is read-only on delivery branches; background automation does not race the orchestrator by
  pushing formatter/fix commits.
- Each implementation gate records exact-head evidence before downstream work treats it as satisfied.
