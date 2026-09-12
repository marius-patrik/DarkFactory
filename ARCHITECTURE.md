# DarkFactory — Architecture

**Status: NORMATIVE.** This document is the single normative source of truth for the DarkFactory
process topology, autonomous pipeline contracts, harness abstractions, and repository governance.
`VISION.md` is non-normative reference material and never overrides this document. Architectural
changes require an Approved Architecture Decision Record (ADR) in `notes/architecture_decisions.md`.

---

## 1. System Thesis

DarkFactory is an **autonomous software engineering factory template** ("Lights-Out Software Engineering").
In manufacturing, a dark factory operates with fully automated machinery without human intervention on the floor.
In software development, DarkFactory provides an end-to-end autonomous pipeline that ingests user requests,
classifies and interprets requirements, formulates implementation plans, executes code edits, runs tests and
linters, performs recursive self-reviews, opens bot-authored pull requests, and merges them automatically once
maintainer approval is received.

### Core Tenet: Two Explicit Human Gates
Autonomous agents must not drift into unapproved scope. DarkFactory enforces two non-negotiable human gates:
1. **Interpretation Gate**: The user/maintainer explicitly approves the agent's interpretation of the verbatim
   request before any planning begins.
2. **Plan Gate**: The user/maintainer explicitly approves the formal implementation plan before any code is modified.

---

## 2. Process Topology & Execution Flow

```
                      ┌──────────────────────────────────────────────┐
                      │              GitHub Issue Event              │
                      │  (labeled `Request` with verbatim wording)   │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │         Stage 1: Interpretation              │
                      │   Agent interprets request scope & semantics │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │       Human Gate 1: Maintainer Approval      │
                      │      Maintainer comments `approve`           │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │            Stage 2: Planning                 │
                      │   Agent creates child issue with `Plan`      │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │       Human Gate 2: Maintainer Approval      │
                      │      Maintainer comments `approve`           │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │         Stage 3: Implementation              │
                      │  Agent checks out branch, writes code/tests  │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │          Stage 4: Self-Review Loop           │
                      │  Autonomous static analysis & fix iterations │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │         Stage 5: Plan Alignment              │
                      │  Verifies code matches plan or logs diff     │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │         Stage 6: Draft Pull Request          │
                      │  Opened by github-actions[bot] with Closes # │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │    Human Review Gate: Maintainer Approval    │
                      │  Maintainer submits GitHub PR Review Approve │
                      └──────────────────────┬───────────────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────────────┐
                      │       Stage 7: Auto-Merge & Reconcile        │
                      │  Squash-merge PR, delete branch, Done status │
                      └──────────────────────────────────────────────┘
```

---

## 3. Subsystem Decomposition

| Subsystem | Source Component | Responsibilities |
|---|---|---|
| **Agent Runner Pipeline** | `.github/scripts/agent_runner.py` | Multi-phase pipeline orchestrator (interpret, plan, implement, review, align), credential preparation, and checkpointed quota ladder. |
| **Harness Abstraction** | `.github/scripts/harnesses.py` | CLI execution wrappers for Antigravity, Claude Code, Codex, Kimi, Grok, Cursor, and Opencode with multi-account and companion secret resolution. |
| **Project Board Client** | `.github/scripts/project_automation.py` | GraphQL interface to GitHub Projects v2; manages lifecycle state mutations with incremental budgeting and rate-limit backoff. |
| **PR Approval & Auto-Merge** | `.github/scripts/handle_pr_approval.py` | Listens for maintainer review approval, performs auto-merge, and reconciles bound issues. |
| **PR Dispatcher** | `.github/scripts/open_pr.py` | Bot PR authoring via GitHub API or workflow dispatch. |
| **Settings as Code** | `.github/scripts/repo_settings.py` | Programmatic synchronization of labels, rulesets, branch protection, and Pages. |
| **Documentation Virtualizer** | `.github/scripts/docs_hooks.py` | Dynamically mounts canonical root markdown files into the documentation site without static duplication. |
| **Container Sandbox** | `docker/Dockerfile.agent` | Hermetic execution environment isolating agent toolchains from host runners. |

---

## 4. Capability Matrix & Classification Taxonomy

Requests are classified into two orthogonal taxonomy axes: **Type** and **Area**.

### 4.1 Type Taxonomy
Maps directly to Conventional Commit specifications:
- `feat`: New feature or capability addition.
- `bug`: Defect fix or error resolution.
- `refactor`: Structural or algorithmic improvement without behavioral change.
- `docs`: Documentation, docstrings, or architectural notes.
- `test`: Addition or modification of unit, integration, or regression tests.
- `chore`: Maintenance, dependency bump, or tooling adjustment.
- `ci`: CI/CD workflows, runners, or repository automation.

### 4.2 Area Taxonomy
Scopes the subsystem affected by the change:
- `area:agents`: Harness orchestration, provider adapters, personas, approvals.
- `area:governance`: Agent rules, branch protection, required checks, project board taxonomy.
- `area:release`: Versioning modes, tagging, asset packaging, release notes.
- `area:docs`: Documentation site, theme, architecture notes.
- `area:ci`: GitHub Actions workflows, containers, runner scripts, repository automation.

---

## 5. Project Board State Taxonomy

The GitHub Project v2 board tracks seven mutually exclusive states:
1. `Backlog`: Staged items awaiting prioritization or human review.
2. `ToDo`: Items with approved interpretations and plans, ready for active implementation.
3. `In Progress`: Items with active topic branches, drafts, or running agent containers.
4. `Blocked`: Impeded items (external dependency, missing secret, or agent quota exhaustion).
5. `Done`: Merged PRs, closed issues, and successfully deployed changes.
6. `Superseded`: Items rendered obsolete or overridden by subsequent decisions.
7. `Dropped`: Items rejected, abandoned, or closed without implementation.

---

## 6. Resilience, Quota Exhaustion & Fallback Ladder

When an agent harness or automation subsystem encounters quota exhaustion (e.g. HTTP 429, `RESOURCE_EXHAUSTED`, secondary rate limits):
Every rung of the ladder is a **quota** move — somewhere with capacity the last attempt did not have. Answering an exhausted quota with a weaker model is not a rung: it finds no capacity, it only answers worse, so models are configured per node and never degraded here.

### 6.1 Multi-Tier Quota Ladder

1. **Detection**: `is_quota_exhausted` parses stderr and exit diagnostics for quota exhaustion indicators.
2. **Account Rotation**: The same harness and model on the next account. A harness may hold several, numbered (`X`, `X_2`, `X_3`); adding one is adding a secret. This is the innermost rung because it is the cheapest fresh quota available.
3. **Pool Rotation**: The next model that bills against a *separate pool*. Only Antigravity has more than one — its Gemini and Claude models draw on different quotas — which is why it declares two and Claude declares one.
4. **Harness Fallback**: The next harness in `AGENT_HARNESS_CHAIN` (e.g. Antigravity → Claude → Codex → Kimi).
5. **Exponential Backoff**: Reserved for the *last* attempt, via `calculate_backoff`. An unused account is always a better answer than sleeping, so waiting happens only when there is nothing left to rotate to.
6. **State Checkpointing**: If every account of every pool of every harness is exhausted, the pipeline serializes working state into `.agent_runner_checkpoint.json`, moves the board item to `Blocked`, and posts an alert comment.
7. **Resume**: Subsequent dispatches check for checkpoints and resume seamlessly from the exact step where quota paused.

### 6.2 Secondary Accounts & Companion Secrets

Provider harnesses authenticate through credentials and companion parameters declared in `.github/scripts/harnesses.py`. Secondary accounts and companion secrets provide fallback across quota boundaries without pipeline disruption:

- **Numbered Account Secrets**: Multiple accounts for any harness are configured by appending integer suffixes to secret names (for example, `CLAUDE_CODE_OAUTH_TOKEN_2`, `ANTHROPIC_API_KEY_2`, or `GEMINI_API_KEY_2`). Adding or rotating an account requires only adding a repository secret; no workflow, CLI harness, or pipeline code changes are needed.
- **Companion Secrets**: Certain harnesses (such as OAuth-authenticated CLIs) require companion parameters alongside primary tokens—specifically client IDs and client secrets (e.g., `CLAUDE_CLIENT_ID` and `CLAUDE_CLIENT_SECRET`). Companion secrets are numbered symmetrically for secondary accounts (`CLAUDE_CLIENT_ID_2`, `CLAUDE_CLIENT_SECRET_2`). While companion parameters do not authenticate on their own and are excluded from standalone satisfaction checks (`is_satisfied`), the harness registry tracks them via `companion_names` and `secret_names` to guarantee complete parameter bundles during OAuth token exchange.
- **Environment Isolation & Alias Mapping (`credential_env`)**: Underlying CLI tools only inspect canonical, unnumbered environment variable names (e.g., `CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`). When rotating to a secondary account:
  1. The runner purges all candidate credential and companion variables across all accounts from the process environment, preventing credential cross-contamination or inadvertent fallback to exhausted primary keys.
  2. The selected account's secret is injected under the primary environment variable name (`auth.env_names(1)`).
  3. Associated companion secrets (`auth.companion_names(attempt.account)`) are mapped to the primary companion variable names (`auth.companion_names(1)`).
  Because of this transparent aliasing, CLI harnesses operate unaware of account rotation, providing seamless fallback without pipeline disruption, binary reconfiguration, or container rebuilds.
- **OAuth Refresh & Token Persistence (`prepare_credentials`, `persist_rotated_token`)**: Providers that issue rotating refresh tokens during OAuth exchange invalidate previous tokens. Discarding rotated tokens would strand the credential for subsequent runs. The runner performs dynamic token exchange via `prepare_credentials`, updates the environment, and writes refreshed tokens back to GitHub repository secrets under that account's specific secret name via `persist_rotated_token`.

### 6.3 Quota Backoff & State Checkpointing

- **Exponential Backoff with Jitter (`calculate_backoff`)**: Delay intervals follow exponential backoff with additive jitter (`base_delay * (backoff_factor ** attempt)` plus random jitter bounded by `max_delay`). Backoff is strictly reserved for the final attempt on the last available harness: an unused secondary account or alternative harness is always prioritized over sleeping.
- **Clean Checkpointing**: When all rungs of the fallback ladder are exhausted, the agent runner serializes execution state into `.agent_runner_checkpoint.json`, moves the GitHub Project board item to `Blocked`, posts an issue comment detailing resume instructions, and exits cleanly (exit status 0) without triggering workflow failures. Commenting `resume` restores the serialized state and continues execution from the exact step where quota paused.

### 6.4 Incremental Project Automation & Rate-Limit Backoff

GitHub Projects v2 operations interact with GitHub GraphQL and REST rate limits. To maintain reliable board synchronization without hitting API rate limits or triggering abuse bans:

- **Dual-Token Isolation (`_env_for`)**: Projects v2 board mutations require user-scoped permissions (`GH_PROJECT_TOKEN`), whereas repository operations (issues, pull requests, labels, comments) run under the GitHub App token (`GH_TOKEN`). Splitting these tokens prevents high-volume repository activity from exhausting the project board's GraphQL quota.
- **Incremental Mutation Budget (`MUTATION_BUDGET` / `PROJECT_MUTATION_BUDGET`)**: Project automation enforces a configurable mutation budget per execution run (default 25, configurable via `PROJECT_MUTATION_BUDGET`). This caps the maximum number of GraphQL mutations in a single workflow step.
- **Check-Before-Write Idempotency (`load_existing_items`)**: The project client queries and caches existing board items and their current statuses. If an issue or pull request already resides on the board with the desired status, no write mutation is issued, preserving mutation budget.
- **Quota-Safe Deferral**: When the mutation budget is reached during event handling or status reconciliation, remaining items are deferred to subsequent workflow runs. This produces smooth, incremental board updates without burst rate-limit spikes.
- **Rate-Limit Detection & Graceful Backoff (`is_rate_limited`, `RATE_LIMITED`)**:
  - The automation inspects stderr and command outputs for throttling signatures (such as `"unknown owner type"`, `"rate limit"`, `"secondary rate limit"`, `"too many requests"`, `"was submitted too quickly"`, or `"quota exceeded"`).
  - Upon detection, the client sets `RATE_LIMITED = True` and suspends further board mutations for the current execution window.
  - The process exits cleanly with exit code 0, allowing pending synchronizations to resume on the next scheduled run without failing CI workflows or incurring secondary rate limit penalties.
- **Failure Aggregation (`FAILURES`)**: Board write errors are collected in `FAILURES` rather than aborting immediately, ensuring that temporary failure on one board does not block updates to other linked boards. Non-rate-limit errors are reported at completion, exiting non-zero to surface real infrastructure faults.

---

## 7. Foundational Architecture Decisions

The eight foundational architecture decisions gating the DarkFactory model:

| ID | Title | Summary |
|---|---|---|
| D1 | **Harness-Agnostic Agent Pipeline** | The agent runner interacts with providers through an abstract harness contract (`Harness`), allowing drop-in replacement of CLIs. |
| D2 | **Two-Gate Human Approval Contract** | Non-negotiable human approvals on interpretation and planning prevent autonomous scope drift. |
| D3 | **GitHub-Native State Synchronization** | Lifecycle states are synchronized directly to GitHub Projects v2 via GraphQL, maintaining single-source truth. |
| D4 | **Containerized Sandbox Isolation** | Autonomous agent processes execute inside a hermetic container with non-root privileges and strict env scoping. Non-root execution is enforced by a `USER agent` directive in `docker/Dockerfile.agent`. The unprivileged user is created with uid 1001, matching the GitHub runner's own user so the bind-mounted workspace stays writable without loosening its permissions. `tests/test_governance.py` asserts the directive is present to prevent silent regression. |
| D5 | **Conventional Commits & Automated Formatting** | Strict commit grammar enforced by CI; zero review cycles spent on formatting via automated bot committers. |
| D6 | **Pure-Code Repository Settings** | All GitHub repository metadata, branch protections, labels, and permissions are declared as code in `repo_settings.py`. |
| D7 | **Virtual Documentation Publishing** | Root normative documents are mounted at build time into properdocs virtual pages, eliminating copy-paste documentation decay. |
| D8 | **Multi-Tier Fallback & Quota Ladder** | Rotation across accounts, quota pools and CLI harnesses — every rung a fresh quota rather than a weaker answer — with automated state checkpointing on total exhaustion. |
