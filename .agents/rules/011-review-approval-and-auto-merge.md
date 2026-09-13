---
id: DF-RULE-011
title: Review approval and auto-merge
status: normative
applies_to: [agents, automation]
activation: always
owners: [harness-auth, system-audit]
---
# Rule 11 — Pull request review approval and auto-merge

## Requirement

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

## Rationale

A single approved, squash-merged, auto-deleted history is the fastest correct loop the system can
maintain without claiming human review that did not happen.

## Enforcement

- `.github/scripts/repo_settings.py` configures required reviews, stale-dismissal, and auto-merge.
- `.github/scripts/handle_pr_approval.py` drives the approval webhook path.
- Merge strategy has one executable source; review-cap limits live in the agent loop.

## Exceptions

None.

## Change control

Identity, `gh`-vs-API invocation, and merge mode are resolved by `harness-auth`, `gh-client`, and
the merge-strategy owner; rule text names behavior, not implementation literals.