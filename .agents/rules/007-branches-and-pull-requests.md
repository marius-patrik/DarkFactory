---
id: DF-RULE-007
title: Branches and pull requests
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [harness-auth]
---
# Rule 7 — Branch and pull request workflow

## Requirement

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

## Rationale

Topic branches keep every review archaeology traceable, and bot authorship keeps the human as
reviewer rather than author.

## Enforcement

- `.github/scripts/agent_runner.py` builds branch names (no issue numbers) and drafts PRs.
- `tests/test_agent_runner.py` pins branch-naming behavior.
- `.github/scripts/repo_settings.py` configures branch protection idempotently.

## Exceptions

None.

## Change control

Prerequisite `gh-client` replaces literal `gh` invocations; `harness-auth` owns the canonical
automation identity for bot-authored PRs.