# DarkFactory

**Turn-key template repository for fully autonomous, governed software engineering pipelines ("Lights-Out Software Engineering").**

One engine, fully automated delivery. DarkFactory provides a complete, battle-tested autonomous software factory setup where feature requests, bug reports, and refactors are ingested, interpreted, planned, implemented, self-reviewed, and merged under rigorous human approval gates.

> **Status: Template repository.** Instantiate this repository to bootstrap any new or existing software project with an enterprise-grade autonomous development pipeline, strict branch protection, project board automation, and multi-harness agent orchestration.

---

## The Dark Factory Model

In manufacturing, a **Dark Factory** (or *lights-out factory*) operates autonomously with zero or minimal on-site human intervention. DarkFactory brings this paradigm to software engineering:

```
user request  ──▶  Request issue      ──▶  interpretation  ──▶  maintainer comments `approve`
                   (verbatim wording)      (agent)
                                                    │
                                                    ▼
                   Plan issue (sub-issue) ──▶  maintainer comments `approve`
                                                    │
                                                    ▼
                   branch ─▶ Draft PR (bot-authored) ─▶ self-review loop ─▶ plan alignment
                                                    │
                                                    ▼
                   maintainer Review Approval ──▶  auto-merge  ──▶  issues closed, board set to Done
```

### Two Explicit Human Gates
1. **Interpretation Gate**: You approve the agent's interpretation of your verbatim request before any planning begins.
2. **Plan Gate**: You approve the structured implementation plan before any code is written.

Once both gates are approved, the autonomous pipeline generates the branch, drafts the PR, runs self-review cycles, enforces plan alignment, and waits for your native GitHub PR review approval before auto-merging.

---

## Core Pillars & Features

| Capability | Description |
|---|---|
| **Multi-Harness Agent Runner** | Native support for Antigravity (`agy`), Claude Code, Codex, Kimi, Grok, Cursor, and Opencode with configurable priority order. |
| **Quota & Error Resilience** | Automatic quota exhaustion detection, exponential backoff, state checkpointing, and graceful multi-model fallback. |
| **Two-Gate Human Governance** | Non-negotiable human sign-offs on interpretation and planning prevent hallucinated scope drift. |
| **Bot-Authored Draft PRs** | Pull requests are opened by `github-actions[bot]` so maintainers can natively review, comment, and approve them on GitHub. |
| **Project Board Automation** | Live 7-state taxonomy synchronization on GitHub Projects v2 (`Backlog`, `ToDo`, `In Progress`, `Blocked`, `Done`, `Superseded`, `Dropped`). |
| **Settings as Code** | Complete GitHub repository configuration (labels, branch protection, permissions, auto-merge, Pages) executed idempotently via `repo_settings.py`. |
| **Virtual Documentation** | MkDocs hook publishes canonical root documents (`AGENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `VISION.md`) directly to GitHub Pages without committed static duplicates. |
| **Strict CI & Test Guards** | Guarded language jobs (`hashFiles`) prevent false skips while product code is bootstrapping, keeping required status checks green. |

---

## Repository Structure

| Path | Purpose |
|---|---|
| `AGENTS.md` | **Normative.** The 16 binding rules for every contributor (human or AI agent). |
| `ARCHITECTURE.md` | **Normative.** Process topology, pipeline contracts, and foundational architecture decisions. |
| `ROADMAP.md` | Epics, entry gates, and sequencing rationale. |
| `VISION.md` | **Reference.** Scoping, requirements rationale, and system vision. |
| `.github/workflows/agent.yml` | Containerized autonomous agent workflow dispatched on issues, comments, and PR reviews. |
| `.github/workflows/ci.yml` | Multi-Python CI pipeline, guarded language verification, and docs validation. |
| `.github/workflows/project-automation.yml` | GitHub Project board transitions driven by issue and PR lifecycle events. |
| `.github/workflows/pr-approval-automerge.yml` | Maintainer approval detection, PR auto-merge, and post-merge board reconciliation. |
| `.github/workflows/open-pr.yml` | Opens draft pull requests authored by the bot. |
| `.github/workflows/auto-format.yml` | Automated code formatting on push across all branches. |
| `.github/workflows/verify-pr-issue.yml` | Enforces that every pull request binds an open issue. |
| `.github/workflows/deploy-docs.yml` | Automated documentation site deployment to GitHub Pages. |
| `.github/scripts/agent_runner.py` | Multi-stage autonomous agent execution pipeline with quota backoff and checkpoint/resume. |
| `.github/scripts/harnesses.py` | CLI harness abstraction layer driving Antigravity, Claude, Codex, Kimi, and other runners. |
| `.github/scripts/project_automation.py` | GitHub Projects v2 GraphQL client managing board status transitions. |
| `.github/scripts/handle_pr_approval.py` | Pull request approval detection and auto-merge handler. |
| `.github/scripts/repo_settings.py` | Declarative GitHub repository settings, labels, and branch protection as code. |
| `docker/Dockerfile.agent` | Reproducible container environment equipped with Python, uv, Node/Bun, Rust, and Git. |
| `tests/` | 120+ unit tests validating governance rules, pipeline configs, harnesses, and automation. |

---

## Quickstart: Using This Template

### 1. Create your repository
Click **Use this template** on GitHub, or run:
```bash
gh repo create my-project --template marius-patrik/DarkFactory --public --clone
cd my-project
```

### 2. Install development tools
```bash
pip install -r requirements-dev.txt
pytest -v
```

### 3. Bootstrap repository settings
Configure GitHub labels, merge permissions, and topics without locking protection yet:
```bash
python .github/scripts/repo_settings.py --apply --skip-protection
```

### 4. Create your Project board and set secrets
1. Create a GitHub Project v2 named **DarkFactory** (or your project name).
2. Set the repository variable:
   ```bash
   gh variable set PROJECT_NUMBER --body "<project-number>"
   ```
3. Set your pipeline secrets:
   ```bash
   # Required for GitHub Project writes and bot PR CI triggers:
   gh secret set GH_PROJECT_TOKEN
   
   # Provider secrets (for whichever agent harness you use):
   gh secret set ANTIGRAVITY_REFRESH_TOKEN
   gh secret set ANTIGRAVITY_CLIENT_ID
   gh secret set ANTIGRAVITY_CLIENT_SECRET
   
   # Enable the autonomous agent runner:
   gh variable set AGENT_ENABLED --body "true"
   ```

### 5. Apply branch protection
Once initial commits are landed and CI reports green:
```bash
python .github/scripts/repo_settings.py --apply
```

From this moment on, your repository operates as an autonomous Dark Factory!

---

## Local Development & Testing

```bash
# Run unit tests
pytest -v

# Check formatting
black --check .

# Serve documentation locally
mkdocs serve
```

---

## License

GPL-3.0. See [LICENSE](LICENSE).
