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
| **Agent Runner Pipeline** | `.github/scripts/agent_runner.py` | Multi-phase pipeline orchestrator (interpret, plan, implement, review, align). |
| **Harness Abstraction** | `.github/scripts/harnesses.py` | CLI execution wrappers for Antigravity, Claude Code, Codex, Kimi, Grok, Cursor, and Opencode. |
| **Project Board Client** | `.github/scripts/project_automation.py` | GraphQL interface to GitHub Projects v2; manages lifecycle state mutations. |
| **PR Approval & Auto-Merge** | `.github/scripts/handle_pr_approval.py` | Listens for maintainer review approval, performs auto-merge, and reconciles bound issues. |
| **PR Dispatcher** | `.github/scripts/open_pr.py` | Bot PR authoring via GitHub API or workflow dispatch. |
| **Settings as Code** | `.github/scripts/repo_settings.py` | Programmatic synchronization of labels, rulesets, branch protection, and Pages. |
| **Documentation Virtualizer** | `.github/scripts/mkdocs_hooks.py` | Dynamically mounts canonical root markdown files into MkDocs without static file duplication. |
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
- `area:core`: Microkernel, IPC, substrate bus, daemon, configuration, runtime architecture.
- `area:ui`: User interface, DOM layout, theming, visual components.
- `area:term`: Terminal cell-grid renderer, ANSI pipeline, PTY integration, TUI surfaces.
- `area:agents`: Multi-harness orchestration, agent harnesses, provider adapters, personas, prompt templates.
- `area:browser`: Embedded browser engine, CDP bridge, render pipelines.
- `area:data`: Database schema, persistence, migrations, sync, storage.
- `area:ext`: Extension host, plugin API, capability sandboxing.
- `area:ci`: GitHub Actions, container definitions, runner scripts, repo automation.
- `area:docs`: Documentation, MkDocs configuration, architecture notes.

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

When an agent harness encounters quota exhaustion (e.g. HTTP 429, `RESOURCE_EXHAUSTED`, rate limits):
1. **Detection**: `is_quota_exhausted` parses stderr and exit diagnostics.
2. **Exponential Backoff**: Delays scale progressively via `calculate_backoff`.
3. **Model Fallback**: Shifts down the model chain within the active harness.
4. **Harness Fallback**: Transitions to the next harness in `AGENT_HARNESS_CHAIN` (e.g. Antigravity → Claude → Codex → Kimi).
5. **State Checkpointing**: If all harnesses and models are exhausted, the pipeline serializes working state into `.agent_runner_checkpoint.json`, moves the board item to `Blocked`, and posts an alert comment.
6. **Resume**: Subsequent dispatches check for checkpoints and resume seamlessly from the exact step where quota paused.

---

## 7. Foundational Architecture Decisions

The eight foundational architecture decisions gating the DarkFactory model:

| ID | Title | Summary |
|---|---|---|
| D1 | **Harness-Agnostic Agent Pipeline** | The agent runner interacts with providers through an abstract harness contract (`Harness`), allowing drop-in replacement of CLIs. |
| D2 | **Two-Gate Human Approval Contract** | Non-negotiable human approvals on interpretation and planning prevent autonomous scope drift. |
| D3 | **GitHub-Native State Synchronization** | Lifecycle states are synchronized directly to GitHub Projects v2 via GraphQL, maintaining single-source truth. |
| D4 | **Containerized Sandbox Isolation** | Autonomous agent processes execute inside a hermetic container with non-root privileges and strict env scoping. |
| D5 | **Conventional Commits & Automated Formatting** | Strict commit grammar enforced by CI; zero review cycles spent on formatting via automated bot committers. |
| D6 | **Pure-Code Repository Settings** | All GitHub repository metadata, branch protections, labels, and permissions are declared as code in `repo_settings.py`. |
| D7 | **Virtual Documentation Publishing** | Root normative documents are mounted at build time into MkDocs virtual pages, eliminating copy-paste documentation decay. |
| D8 | **Multi-Tier Fallback & Quota Ladder** | Graceful degradation across models and CLI harnesses with automated state checkpointing on total exhaustion. |
