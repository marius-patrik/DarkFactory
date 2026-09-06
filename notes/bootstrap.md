# Bootstrap and operator runbook

How this repository was brought up, what still needs a human, and how to reproduce the whole thing
if it is ever recreated or used to bootstrap a new autonomous project.

---

## What is already done

| Item | State |
|---|---|
| Repository `marius-patrik/DarkFactory`, public template | created |
| Governance (`AGENTS.md`, `ARCHITECTURE.md`, `ROADMAP.md`, `VISION.md`) | committed |
| Workflows: CI, auto-format, docs deploy, bound-issue check, board automation, open-PR, approval auto-merge, agent | committed, all green on `main` |
| Automation scripts and 120+ tests | committed, passing |
| Labels (32), merge settings, topics, Actions write + PR-approval permission, Pages | applied |
| Project board **DarkFactory** with all seven Status options | created |
| Repository variable `PROJECT_NUMBER` | configured |
| Branch protection on `main`: 8 required checks, strict, 1 review, conversation resolution | applied |
| 8 decision issues (D1–D8) and 10 epic issues (E1–E10), all on the board at `Backlog` | seeded |

## What still needs a human

### 1. `GH_PROJECT_TOKEN` — required before the pipeline can complete a cycle

This is the one blocking gap, and it blocks two things at once:

- **Projects v2 writes.** The default `GITHUB_TOKEN` cannot write to a *user-owned* project, so the
  board automation currently places items but cannot set their status from CI.
- **Bot PRs that trigger CI.** GitHub deliberately does not start workflow runs for events caused by
  `GITHUB_TOKEN`. A draft PR opened by `open-pr.yml` under `GITHUB_TOKEN` therefore never runs the
  required checks, and can never satisfy branch protection.

Create a classic PAT with `repo`, `workflow`, and `project` scopes, then:

```bash
gh secret set GH_PROJECT_TOKEN --repo marius-patrik/DarkFactory
```

Until this exists, every pull request has to be merged by an admin override rather than by the
designed approve-and-auto-merge path.

### 2. Agent provider secrets — required before the agent runs at all

```bash
gh secret set ANTIGRAVITY_REFRESH_TOKEN --repo marius-patrik/DarkFactory
gh secret set ANTIGRAVITY_CLIENT_ID     --repo marius-patrik/DarkFactory
gh secret set ANTIGRAVITY_CLIENT_SECRET --repo marius-patrik/DarkFactory
gh variable set AGENT_ENABLED --body "true" --repo marius-patrik/DarkFactory
```

The agent job is gated on `AGENT_ENABLED` precisely so that filing an issue before the secrets exist
does not start a container build that cannot authenticate. Its first step re-checks the refresh
token, because `secrets` is not available in a job-level `if`.

### 3. Answer D1

`ARCHITECTURE.md` §7 lists eight open decisions. Seven of them gate one or two epics. **D1 gates
everything**: until there is a day-one user workflow, "which messages does the Substrate Bus carry"
has no answer that is not guesswork. Issue #1.

---

## Reproducing this from an empty repository

Order matters. Branch protection must go on **after** the first push, or the initial commit cannot
land.

```bash
gh repo create DarkFactory --public --template
git init -b main && git remote add origin https://github.com/<owner>/DarkFactory.git

# 1. Commit the scaffold and push it while `main` is still unprotected.
git add -A && git commit -m "feat(ci): scaffold repository, governance, and pipeline"
git push -u origin main

# 2. Apply everything except protection, so the first CI run can report.
python .github/scripts/repo_settings.py --apply --skip-protection

# 3. Point the workflows at the board that step 2 created.
gh variable set PROJECT_NUMBER --body "<number>"

# 4. Protect `main`. From here on, every change goes through a pull request.
python .github/scripts/repo_settings.py --apply
```

`repo_settings.py` is idempotent, so step 4 also re-applies steps 2's settings; `--plan` shows what
would change without touching anything.

### If a bootstrap commit is still pending when protection goes on

Lift protection, push, restore it — and say so in the commit or the PR. This is a bootstrap-ordering
escape hatch, not a way around the rules:

```bash
gh api -X DELETE repos/<owner>/DarkFactory/branches/main/protection
git push origin main
python .github/scripts/repo_settings.py --apply
```

---

## Routine operations

| Task | Command |
|---|---|
| Show GitHub-side config drift | `python .github/scripts/repo_settings.py --plan` |
| Re-apply GitHub-side config | `python .github/scripts/repo_settings.py --apply` |
| Repair board items with no status | trigger **Project Board Automation** via `workflow_dispatch` |
| Open a bot-authored draft PR | `python .github/scripts/open_pr.py --branch <b> --title <t> --body <b>` |
| Run the local suite | `pytest -v && black --check . && mkdocs build --strict` |

## Adding a required status check

Required checks live in `repo_settings.REQUIRED_CHECKS`, and a test asserts every entry is produced
by a job in `ci.yml`. Add the job first, let it report once, then add the context and re-apply. Never
require a job that can be skipped: a skipped job does not satisfy a required check, so it blocks
every merge permanently. That is why the `rust` and `web` jobs guard their individual steps with
`hashFiles` rather than guarding the job.
