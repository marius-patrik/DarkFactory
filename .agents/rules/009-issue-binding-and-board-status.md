---
id: DF-RULE-009
title: Issue binding, branch auto-deletion, and board status
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [system-audit]
---
# Rule 9 — Issue binding, branch auto-deletion, and board status

## Requirement

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

## Rationale

A PR that merges without a bound issue leaves no reason to have existed. Board status is the shared
lifecycle view for humans and the agent, exactly one system-owned schema.

## Enforcement

- `.github/scripts/project_automation.py` moves statuses; `repo_settings.py` wires auto-merge and
  deletion.
- `.github/workflows/verify-bound-issue.yml` and `PULL_REQUEST_TEMPLATE.md` enforce the binding
  pattern; `tests/test_governance.py::test_issue_binding_markers`-style tests pin the template.

## Exceptions

None.

## Change control

Board reconciliation and merge strategy have one executable source each; PR-bound statuses converge
on the system-owned schema. Local-branch pruning is a convention, not a centrally enforceable act.