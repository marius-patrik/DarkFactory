---
enforced_by: [conventional-commit]
id: DF-RULE-005
title: Commit granularity
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [system-audit]
---
# Rule 5 — Commit granularity

## Requirement

Keep commits modular, focused, and descriptive — one commit per component or coherent change. All
commits across all branches MUST follow the Conventional Commits format
`<type>(<scope>): <description>` (e.g. `feat(core): add substrate bus frame codec`). The allowed
types and the area taxonomy are defined by DF-RULE-015; this rule covers granularity only.

## Rationale

A coherent change is reviewable and reversible on its own. Splitting unrelated edits into separate
commits keeps `git bisect`, review, and release notes honest.

## Enforcement

- Agent-side: `.github/scripts/agent_runner.py` invokes the harness with a formatting pass before
  review.
- Release parsing reads Conventional Commits (`release` directory) and would report malformed
  subjects.

## Exceptions

Trivial mechanical changes (one-line typos, generated churn from the formatter bot) may stand
alone.

## Change control

The commit taxonomy lives in `015-repository-taxonomy.md`; do not restate the allowed scopes here.