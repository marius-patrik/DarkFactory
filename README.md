# DarkFactory

**Turn-key template repository for fully autonomous, governed software engineering pipelines ("Lights-Out Software Engineering").**

One engine, fully automated delivery. DarkFactory provides a complete, battle-tested autonomous software factory setup where feature requests, bug reports, and refactors are ingested, interpreted, planned, implemented, self-reviewed, and merged under rigorous human approval gates.

> **Status: Template repository.** Instantiate this repository to bootstrap any new or existing software project with an enterprise-grade autonomous development pipeline, strict branch protection, project board automation, and the `df` harness.

---

## The Dark Factory Model

In manufacturing, a **Dark Factory** (or *lights-out factory*) operates autonomously with zero or minimal on-site human intervention. DarkFactory brings this paradigm to software engineering:

```
user request  ──▶  Single request issue  ──▶  interpretation  ──▶  maintainer comments `approve`
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

### Interpretation Gate and Plan Approval Gate
1. **Interpretation Gate**: You approve the agent's interpretation of your verbatim request before any planning begins.
2. **Plan Approval Gate**: You approve the structured implementation plan before any code is written.

Once both gates are approved, the autonomous pipeline generates the branch, drafts the PR, runs self-review cycles, enforces plan alignment, and waits for your native GitHub PR review approval before auto-merging.

---

## Core Pillars & Features

| Capability | Description |
|---|---|
| **TypeScript/Bun `df` Harness** | A high-performance TypeScript/Bun `df` harness providing a unified interface for autonomous execution and CI management. |
| **Workflow Graph Execution** | Orchestrates agents through a strictly defined sequence of stages (Interpretation $\to$ Planning $\to$ Implementation $\to$ Verification). |
| **Quota Engine** | Intelligent resource management with automatic quota exhaustion detection, exponential backoff, and multi‑account rotation to ensure uninterrupted operation. |
| **Lanes** | Isolated execution environments ensuring that parallel requests do not collide and that state is maintained per-task. |
| **Two-Gate Human Governance** | Non-negotiable human sign-offs on interpretation and planning prevent hallucinated scope drift. |
| **Bot-Authored Draft PRs** | Pull requests are opened by `github-actions[bot]` so maintainers can natively review, comment, and approve them on GitHub. |
| **Project Board Automation** | Live 7-state taxonomy synchronization on GitHub Projects v2 (`Backlog`, `ToDo`, `In Progress`, `Blocked`, `Done`, `Superseded`, `Dropped`). |
| **Settings as Code** | Complete GitHub repository configuration (labels, branch protection, permissions, auto-merge, Pages) executed idempotently via `repo_settings.py`. |
| **Generated Documentation** | A Bun generator stages canonical repository sources, builds them with ProperDocs, and removes the transient source tree after publishing to GitHub Pages. |
| **Strict CI & Test Guards** | Guarded language jobs (`hashFiles`) prevent false skips while product code is bootstrapping, keeping required status checks green. |

---

## Repository Structure

| Path | Purpose |
|---|---|
| `PRD.md` | **Normative.** Product requirements, constraints, actors, and acceptance measures. |
| `AGENTS.md` | **Normative.** The binding rules for every contributor (human or AI agent); generated from `.agents/rules/`. |
| `.darkfactory/manifest.json` | **Executable.** Per-repository identity, areas, versioning, and board declaration for the shared pipeline. |
| `_rules` / `_notes` | Root aliases (symlinks) to `.agents/rules/` and `.agents/notes/`. |
| `.github/workflows/agent.yml` | Containerized autonomous agent workflow dispatched on issues, comments, and PR reviews. |
| `.github/workflows/ci.yml` | Multi-Python CI pipeline, guarded language verification, and docs validation. |
| `.github/workflows/project-automation.yml` | GitHub Project board transitions driven by issue and PR lifecycle events. |
| `.github/workflows/pr-approval-automerge.yml` | Maintainer approval detection, PR auto-merge, and post-merge board reconciliation. |
| `.github/workflows/open-pr.yml` | Opens draft pull requests authored by the bot. |
| `.github/workflows/auto-format.yml` | Automated code formatting on push across all branches. |
| `.github/workflows/verify-pr-issue.yml` | Enforces that every pull request binds an open issue. |
| `.github/workflows/deploy-docs.yml` | Automated documentation site deployment to GitHub Pages. |
| `.github/scripts/agent_runner.py` | Multi-stage autonomous agent execution pipeline with quota backoff and checkpoint/resume. |
| `.github/scripts/project_automation.py` | GitHub Projects v2 GraphQL client managing board status transitions. |
| `.github/scripts/handle_pr_approval.py` | Pull request approval detection and auto-merge handler. |
| `.github/scripts/repo_settings.py` | Declarative GitHub repository settings, labels, and branch protection as code. |
| `docker/Dockerfile.agent` | Reproducible container environment equipped with Python, uv, Node/Bun, Rust, and Git. |
| `harness/` | The TypeScript/Bun source for the `df` command and agent runtime. |
| `tests/` | 120+ unit tests validating governance rules, pipeline configs, harnesses, and automation. |

---

## Quickstart: Using This Template

### 1. Create your repository
Click **Use this template** on GitHub, or run:
```bash
gh repo create my-project --template marius-patrik/DarkFactory --public --clone
cd my-project
```

### 2. One‑Command Install
Run the one‑command install to bootstrap the environment and the df harness in one go:
```bash
./bin/install.sh
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

## The `df` command

The `df` harness is the primary entry point for the DarkFactory product. It manages agent execution, account rotation, and repository maintenance.

```bash
df status                  # why is nothing happening
df describe                # what is this repository made of
df auth --repo owner/name  # set harness credentials from this machine
df license                 # apply the licence the manifest declares
df submodules              # pin and update submodules
```

`status` answers the question an operator actually has, by checking the things that are silently
absent rather than loudly broken - a missing credential, an agent that was never switched on, a
repository where the pipeline was never installed.

## Local Development & Testing

```bash
# Run unit tests
pytest -v

# Check formatting
black --check .

# Serve documentation locally
properdocs serve
```

---

## License

GPL-3.0. See [LICENSE](LICENSE).
