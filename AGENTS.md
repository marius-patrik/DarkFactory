# Repository Development Guidelines & Agent Rules

DarkFactory is developed by an autonomous agent pipeline under human approval gates. The sixteen
rules below are canonical in `.agents/rules/` and binding on every contributor — human or agent.
They are enforced by CI, by branch protection, and by the tests in `tests/`. This file is a
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

Every change that adds or modifies code, classes, or methods MUST be accompanied by corresponding
tests. Behavior is verified per change or per pull request, not by an artificial test manufactured
for every commit. Rust code is tested with `cargo test`, TypeScript with `bun test`, and repository
automation (`.github/scripts/`) with `pytest`. All applicable suites MUST pass before a push is
considered green.

### Rule 2 — Inline documentation and generated documentation

Public APIs MUST be documented inline. TypeScript uses TSDoc on exported public symbols across first-party packages/capabilities; Rust and any retained migration Python use their ecosystem documentation conventions.

The final documentation engine is `@darkfactory/docs`, with `docs.df` as the native configuration and ProperDocs/MkDocs files accepted only as compatibility inputs. The same canonical homepage/content graph renders both the published docs homepage and committed `README.md`; CI fails on projection drift. Web presentation belongs only to `@darkfactory/web`.

### Rule 3 — Product requirements and ADRs

`PRD.md` is the normative product requirements document. Current Request bodies define feature-specific behavior and accepted ADRs record durable architecture/rationale. Executable declarations use `repo.df`, `config.df`, `docs.df`, the workflow graph and canonical rules. Legacy manifest/config paths are not final contracts.

Material PRD deviations require owner approval and an accepted numbered ADR before implementation.

### Rule 4 — English language consistency

All code, identifiers, comments, docstrings, commit messages, issues, and documentation MUST be
written in English.

### Rule 5 — Commit granularity

Keep commits modular, focused, and descriptive — one commit per component or coherent change. All
commits across all branches MUST follow the Conventional Commits format
`<type>(<scope>): <description>` (e.g. `feat(core): add substrate bus frame codec`). The allowed
types and the area taxonomy are defined by DF-RULE-015; this rule covers granularity only.

### Rule 6 — CI readiness and verification

Every push MUST leave green status on GitHub Actions across every job in `ci.yml`. A red build is a
stop-the-line event: no further feature work proceeds until it is green. The set of required status
checks is declared by repository settings (`.github/scripts/repo_settings.py` against the manifest)
and enforced by branch protection.

### Rule 7 — Branch and pull request workflow

Normal product changes use dedicated delivery branches and pull requests. Direct mutation of the protected canonical branch is prohibited outside an explicitly authorized bootstrap/emergency operation recorded by the completion plan.

The actual repository default/canonical branch is resolved dynamically; `main` is never assumed. Automation-authored PRs use the canonical DarkFactory GitHub App/bot identity. Required checks/current-base conditions must pass before merge. History rewrites use deterministic git owners and lease-safe expected-old-SHA semantics; blind force push is forbidden.

### Rule 8 — Automated formatting and linting

Formatting is deterministic automation, not a review topic. The final #341 detection + capability-resolution contract determines formatter/linter actions for each detected package/ecosystem. First-party TypeScript workspace packages use the canonical Biome configuration.

Local verification, graph verification and CI consume the same normalized quality-action model. Unsupported/missing actions are diagnosed explicitly rather than silently treated as passing.

### Rule 9 — Request binding, branch cleanup and board status

Every delivery PR explicitly binds every Request it satisfies. A PR may satisfy multiple Requests only when #385 shared-plan/multi-Request rules prove valid coverage; Epic membership or stack topology never implies completion.

Merged branches are cleaned up when safe. The canonical seven project states remain `Backlog`, `ToDo`, `In Progress`, `Blocked`, `Done`, `Superseded`, and `Dropped`. A Request reaches Done only from its own terminal evidence or valid shared-plan completion.

### Rule 10 — Reviewed Planning and implementation alignment

Before implementation, each governed unit of work has one current unified Planning artifact containing the semantic interpretation, evidence-justified implementation approach, dependencies, recovery inputs and verification expectations.

Planning runs an independent review/fix loop until clean, followed by one explicit owner Planning Approval. Separate interpretation and plan approval gates are retired.

Implementation then runs deterministic verification, implementation review/fix, any required scope-amendment approval, final alignment, checks and final merge authorization. Material context changes invalidate stale Planning approval.

### Rule 11 — Pull request review approval and governed merge

Pull requests require the final repository protection/review contract before merge. Native GitHub review approval and canonical authorized DarkFactory approval commands are valid only for authorized actors; free-text cannot advance a gate.

Merge readiness requires current-base/stack validity, green required checks, clean implementation review/fix, final Planning alignment, any required scope-amendment approval and final review/merge authorization. After merge, df deterministically reconciles bound Requests/PRs/project state and safe branch cleanup.

### Rule 12 — Verbatim Request capture and Planning gate

Every governed task is represented by one or more tracked GitHub Requests before implementation. Preserve verbatim user wording, decompose genuinely independent tasks, and resolve Request/Epic/dependency/recovery relationships explicitly.

Generate one unified Planning artifact, independently review/fix it until clean, and require one owner Planning Approval before implementation. There is no final separate Interpretation gate. Delivery remains explicitly bound to the covered Request(s) or an approved shared-plan record.

### Rule 13 — Specification sequence and when issues may exist

Specification proceeds in one direction, and each stage is locked before the next begins:

```text
PRD.md  →  ADRs (.agents/notes/adr/)  →  issues
```

- **An issue may only be filed for work that is settled.** Settled means one of two things: an
  approved ADR resolving the decision the work depends on, or a concrete mechanical task whose
  outcome is not in question (for example, "create the Bun workspace and add these named
  dependencies").
- **Speculative epic and decision issues are prohibited.** Filing an issue for an unanswered
  question moves the argument into the tracker, where it fragments across comment threads instead of
  converging in the document that owns it. Open questions live in the issues and the workflow graph,
  not in a document that competes with the tracker.
- **Large settled bodies of work** are tracked as `epic`-labelled issues: containers carrying the
  scope statement, the acceptance criteria for the area, and a checklist of child `Request` issues.
  Epics are never implemented directly — only their children are.
- The workflow graph, GitHub parent/sub-issue relationships, and project fields are the work
  ledger; no separate planning document shadows them.

### Rule 14 — Capability-driven agent runtime and resilience

DarkFactory runs agentic work through the TypeScript df runtime, not a final Python harness registry. Core owns execution, routing primitives, persistence/resume and capability loading; agentic/product behavior is versioned capabilities.

One canonical capability implementation may generate native Pi, MCP and supported agent skill/plugin adapters. Explicit task kind is preserved where known; undeclared inference separates subject from required capability. Routing respects sensitivity, data-collection policy, capability needs, quotas and capability tiers. Every logical stage has one bounded elapsed-time budget across failover/tools. Natural model stop is valid; mutation truth comes from observed effects. Legacy Python invocation is migration-only until #359.

### Rule 15 — Commits, repository taxonomy and domains

Commits use Conventional Commits `<type>(<scope>): <description>` with the canonical allowed base types. Repository area labels/scopes are declared by final `repo.df`.

Project classification keeps ecosystem, package, semantic domain and capability distinct. Repositories may be multi-package/polyglot/multi-domain. Initial domains include code, paper and math; capabilities are orthogonal. Request classification, commit-scope validation and labels consume the same declared taxonomy rather than copied lists.

### Rule 16 — Security, authentication and secrets

No credential, access token, refresh token, cookie, client secret or private key may be committed, logged, written to issues/PRs, included in generated docs or embedded in static web assets.

`@darkfactory/keychain` is the sole machine/harness credential-custody owner; other packages/capabilities request scoped access rather than reading raw credential stores. `@darkfactory/auth` separately owns human/browser GitHub App authentication and sessions, and browser bundles cannot import keychain/private-key/server-confidential code.

GitHub user authority and GitHub App installation authority remain distinct. Secret-bearing recovery material is preserved locally and blocked from publication rather than leaked or discarded.
