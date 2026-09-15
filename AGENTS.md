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

### Rule 2 — Inline docstrings and generated documentation

All source MUST carry complete API documentation inline:

- **Rust**: `///` doc comments on every public item, with `# Errors` and `# Panics` sections where
  applicable. `cargo doc` MUST build with zero warnings.
- **TypeScript**: TSDoc on every exported symbol.
- **Python** (automation): Google-style docstrings (`Args:`, `Returns:`, `Raises:`) with PEP 484
  type annotations.

Documentation MUST be generated from source and hand-written architecture notes. No static
per-module markdown mirror and no manually maintained documentation index are stored in the
repository. All documentation builds MUST use the command declared by the repository environment
and succeed with zero warnings and zero errors. DarkFactory declares
`bun run scripts/build-docs.ts`, which stages its repository sources, invokes ProperDocs in strict
mode, and deploys the result automatically to GitHub Pages.

### Rule 3 — Product requirements and ADRs

Product requirements are defined by `PRD.md`, the single normative product document. Executable
declarations (providers, taxonomy, workflow graph, installed consumers) live in
`.darkfactory/manifest.json`, and mandatory contribution behavior in `.agents/rules/*.md`. Any
deviation from `PRD.md` MUST be explicitly approved by the user and recorded as a discrete ADR
under `.agents/notes/adr/` before it is implemented.

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

All changes, features, refactors, and bug fixes MUST be developed on dedicated topic branches and
submitted through GitHub Pull Requests. Direct commits and pushes to the protected default branch
(`main` for DarkFactory consumers; the manifest-declared default branch) are prohibited.

- **Branch Naming**: Lowercase, hyphen-separated, descriptive (e.g. `feature/substrate-bus-codec`).
  Branch names MUST NOT contain issue numbers.
- **Bot-Authored PRs**: Pull requests MUST be authored by `github-actions[bot]` via
  `.github/workflows/open-pr.yml` so the repository maintainer is not registered as author and can
  natively review and approve them.
- **Draft Status**: Every pull request MUST be opened in Draft and remain in draft throughout
  development and review until explicitly approved.
- **Up-to-Date with Main**: Every pull request branch MUST contain the latest default branch before
  merge (strict required status checks).
- **Required CI Checks**: All required checks MUST pass green before merging.
- **Branch Protection**: The default branch MUST remain protected with required status checks,
  branch up-to-date enforcement, and pull request review enforcement.

### Rule 8 — Automated formatting and linting

Formatting is not a review topic — it is automated. `rustfmt` for Rust, Biome (`harness/biome.json`)
for TypeScript, and `black` (line length 100) for Python automation. The GitHub Actions bot formats
the codebase on every push across branches and commits any adjustments. Lints are blocking:
`cargo clippy -D warnings` for Rust and `biome ci` for TypeScript. Until the one-time full harness
reformat lands, Biome formats and checks the TypeScript files a change touches.

### Rule 9 — Issue binding, branch auto-deletion, and board status

- **Issue Binding**: Every pull request MUST bind a tracked GitHub issue using closing keywords in
  the PR description (e.g. `Closes #123`, `Fixes #123`, `Resolves #123`).
- **Branch Auto-Deletion**: Merging closes the bound issue and deletes the remote branch
  (`delete_branch_on_merge: true` and `--delete-branch`); the local branch MUST be pruned.
- **Project Board Status Taxonomy**: All issues and pull requests are added to the DarkFactory
  GitHub Project with automated status movements:
  - `Backlog`: Staged items planned for future consideration.
  - `ToDo`: Approved requests or plans ready for implementation.
  - `In Progress`: Active branches, pull requests, or ongoing development.
  - `Blocked`: Items impeded by external dependencies, blockers, or agent quota exhaustion.
  - `Done`: Completed and merged pull requests and resolved issues.
  - `Superseded`: Items rendered obsolete or outranked by subsequent architectural decisions.
  - `Dropped`: Items closed without implementation or cancelled.

### Rule 10 — Pre-implementation planning and plan review

Before implementation begins on any task, the implementation plan MUST be posted as a comment on the
same `Request` issue and approved there. The plan MUST detail objectives, architectural and code
changes, and verification steps.

Both approval gates remain: the interpretation is approved before a plan is written, and the plan is
approved before any code is. One unit of work is one issue, so a pull request binds one thing and
closing it closes one thing.

- **Implementation Review Gate**: Prior to merging the bound pull request, an implementation review
  MUST be conducted and commented on the same issue, confirming the implementation matches the plan
  exactly (`Matches Plan: Yes`).
- **Plan Alignment**: If the implementation diverged from the plan, an alignment comment
  (`Plan Alignment:`) detailing all deviations MUST be posted and explicitly approved before the
  pull request can be merged. CI enforces the presence of both the plan and the pre-merge review on
  all bound issues.

### Rule 11 — Pull request review approval and auto-merge

Pull requests require official GitHub review approval before merging. The default branch protection
requires at least one approving review on the last commit with stale reviews dismissed, without
blocking the last pusher.

- **Native Approval**: Because PRs are authored by `github-actions[bot]`, the maintainer can select
  **Approve** in the GitHub UI, comment `/approve`, `approve`, `lgtm`, or run a native `gh pr
  review <id> --approve`.
- **Auto-Merge Activation**: `.github/workflows/pr-approval-automerge.yml` listens for approvals
  from the maintainer, marks the draft PR ready, and activates auto-merge with branch auto-deletion.
- **Post-Merge Reconciliation**: On merge, automation sets the project status of the PR and all
  bound issues to `Done`, applies the `Done` label, removes `In Progress`, and verifies bound issues
  are closed.

### Rule 12 — User request decomposition, verbatim prompting, and confirmation gate

Every incoming user prompt or task MUST immediately be converted into one or more tracked GitHub
issues labeled `Request` before any planning, branching, or code changes begin.

- **Issue Template**: Use `.github/ISSUE_TEMPLATE/request.yml` for structured request filing.
- **Decomposition**: A single user message containing multiple distinct tasks MUST be decomposed
  into multiple focused `Request` issues.
- **Verbatim Wording**: Each `Request` issue body MUST contain the exact, verbatim wording of the
  user request.
- **Interpretation Section**: Below the verbatim wording, each `Request` issue MUST include an
  `### Interpretation` section specifying how the request is understood, the architectural scope,
  and the proposed verification.
- **Confirmation Gate**: The interpretation requires explicit user confirmation (commenting
  `approve`) before any implementation plan is made.
- **Two gates, one issue**: Once the interpretation is approved, the plan is posted as a comment on
  the same issue and approved there. All subsequent branches and pull requests bind to that issue.

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

### Rule 14 — Harness-agnostic agent runtime and conversational lifecycle

An autonomous AI agent runs containerized in GitHub Actions (`docker/Dockerfile.agent`). It is
**harness-agnostic**: no pipeline code knows which coding-agent CLI is executing.

- **Harness registry**: `.github/scripts/harnesses.py` declares each CLI — Antigravity (`agy`),
  Claude Code (`claude`), OpenAI Codex (`codex`), Kimi (`kimi`), Grok (`grok`), Cursor
  (`cursor-agent`), and opencode (`opencode`) — as a binary, an argv template, the credentials it
  accepts, and its quota pools. Adding a harness is a data change; changing one is a configuration
  change.
- **No hardcoded invocation**: every field is overridable at runtime through the
  `AGENT_HARNESS_CONFIG` repository variable, and the order through `AGENT_HARNESS_CHAIN`, so an
  upstream flag rename never requires a code change or a container rebuild.
- **Graceful degradation**: harnesses whose binary is absent from `PATH`, or whose credentials are
  unset, are skipped rather than failed. An image carrying four of seven CLIs is a working image
  with a shorter fallback chain.
- **Resilience**: exhaustion moves to the next account, then the next pool, then the next harness.
  Only when every account of every pool of every harness is spent does the agent checkpoint and
  block. Authentication uses repository secrets only; the account being run is named in the log, its
  credential never is.
- **Conversational lifecycle**: incoming issues are auto-classified, the agent answers feedback and
  executes adjustments on Request issues and pull requests, bots are ignored to prevent
  self-reply loops, and on plan approval the agent opens a bot-authored Draft PR and self-reviews it
  in separate runs: each review run posts all findings and dispatches a fix run, which dispatches
  the next review, until a review finds nothing (identical findings twice block the PR). On quota
  exhaustion the agent saves a checkpoint, moves
  the item to `Blocked`, comments the resume instructions, and exits cleanly.

### Rule 15 — Conventional commits and taxonomy enforcement

- **Format**: `<type>(<scope>): <description>` (e.g. `feat(term): add cell matrix buffer`).
- **Allowed Types**: `feat`, `fix` (mapped from `bug`), `chore`, `docs`, `refactor`, `test`, `ci`.
- **Allowed Area Scopes & Labels**:
  The taxonomy is **per repository**, declared in `.darkfactory/manifest.json` under `areas`. The
  labels, the permitted commit scopes, and the agent's request classifier all read that one
  declaration, so the three cannot drift apart. A repository adopting this pipeline replaces the
  block with its own domains; the areas below are DarkFactory's own.
  - `area:agents`: Harness orchestration, provider adapters, personas, approvals.
  - `area:governance`: Agent rules, branch protection, required checks, project board taxonomy.
  - `area:release`: Versioning modes, tagging, asset packaging, release notes.
  - `area:docs`: Documentation site, theme, architecture notes.
  - `area:ci`: GitHub Actions workflows, containers, runner scripts, repository automation.

### Rule 16 — Security and secrets

No credential, token, refresh token, cookie, or private key is ever committed, echoed into workflow
logs, or written into issue or PR bodies. All secrets live in GitHub repository secrets or the local
OS keychain. Workflow logs must be assumed public. Credentials exist only in DarkFactory's own
environment and are never propagated to consumer repositories; consumers authenticate through their
own secrets. No secret value is ever named in a rule or a rule reference.
