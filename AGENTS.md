# Repository Development Guidelines & Agent Rules

DarkFactory is developed by an autonomous agent pipeline under human approval gates. The sixteen
rules below are canonical in `.agents/rules/` and binding on every contributor — human or agent.
They are binding regardless of enforcement mechanism. CI, branch protection and tests enforce the portions already automated. This file is a
projection of those canonical files: it carries the normative requirement text of every rule and an
index back to each canonical file for rationale and enforcement. Edit `.agents/rules/*.md`; do not
edit this projection.

## Index

| ID | Rule | Canonical file |
|---|---|---|
| `DF-RULE-001` | Unit tests | `.agents/rules/001-unit-tests.md` |
| `DF-RULE-002` | Inline docstrings and generated documentation | `.agents/rules/002-inline-docs-and-generated-documentation.md` |
| `DF-RULE-003` | Product requirements and ADRs | `.agents/rules/003-product-requirements-and-adrs.md` |
| `DF-RULE-004` | English language consistency | `.agents/rules/004-english-language.md` |
| `DF-RULE-005` | Commit granularity | `.agents/rules/005-commit-granularity.md` |
| `DF-RULE-006` | CI readiness | `.agents/rules/006-ci-readiness.md` |
| `DF-RULE-007` | Branches and pull requests | `.agents/rules/007-branches-and-pull-requests.md` |
| `DF-RULE-008` | Formatting and linting | `.agents/rules/008-formatting-and-linting.md` |
| `DF-RULE-009` | Issue binding and board status | `.agents/rules/009-issue-binding-and-board-status.md` |
| `DF-RULE-010` | Approved delivery plan | `.agents/rules/010-approved-delivery-plan.md` |
| `DF-RULE-011` | Review approval and auto-merge | `.agents/rules/011-review-approval-and-auto-merge.md` |
| `DF-RULE-012` | Request capture and confirmation | `.agents/rules/012-request-capture-and-confirmation.md` |
| `DF-RULE-013` | Specification and work tracking | `.agents/rules/013-specification-and-work-tracking.md` |
| `DF-RULE-014` | Agent runtime and resilience | `.agents/rules/014-agent-runtime-and-resilience.md` |
| `DF-RULE-015` | Repository taxonomy | `.agents/rules/015-repository-taxonomy.md` |
| `DF-RULE-016` | Security and secrets | `.agents/rules/016-security-and-secrets.md` |


---

### Rule 1 — Unit tests

Every change that adds or modifies behavior MUST be accompanied by corresponding tests at the
appropriate package/capability boundary. Behavior is verified per change or pull request, not by an
artificial test manufactured for every commit.

Applicable test actions come from the canonical repository/package detection plus capability-resolution
contract. First-party TypeScript packages/capabilities use the normalized Bun test action. Retained
non-TypeScript tooling uses its detected/capability-provided test action. All applicable suites MUST
pass before a push is considered green.

### Rule 2 — Inline documentation and generated documentation

Public source APIs MUST be documented inline.

- **TypeScript**: TSDoc on every exported public symbol in first-party packages and capabilities.
- **Rust**: `///` documentation on public items, including error/panic behavior where applicable.
- **Python**: any retained Python tooling exposes typed Google-style docstrings on public helpers.

Documentation MUST be generated from canonical source and architecture records. DarkFactory's documentation engine is `@darkfactory/docs`; TypeDoc may be used internally for TypeScript extraction. `docs.df` is the only DarkFactory documentation configuration contract.

The same canonical homepage/content graph MUST render both the published docs homepage and committed `README.md`. CI MUST fail on deterministic README projection drift.

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

The canonical/default branch MUST remain green on its required checks. A red canonical branch is a stop-the-line event for repository-wide delivery until restored.

A failing topic/recovery branch blocks that branch's merge and any dependent work, but does not globally halt unrelated isolated branches whose own required checks are green. Parallel work is allowed when it cannot consume or hide the failing branch state.

Required checks are derived from the final normalized package/capability quality contract and synchronized with branch protection. A branch may not merge while any required check for its current head is red, missing or stale.

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
