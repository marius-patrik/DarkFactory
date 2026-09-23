---
id: DF-RULE-005
title: Commit granularity
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [hooks, release]
---
# Rule 5 — Commit granularity

## Requirement

Keep commits modular, focused, and descriptive — one commit per component or coherent change. A
single delivery PR may contain multiple coherent commits; one PR does not imply one commit. When an
integration/orchestrator session combines parallel worker output, preserve coherent commit boundaries
until the final merge rather than collapsing unrelated work into one opaque commit.

All commits across all branches MUST follow the Conventional Commits format
`<type>(<scope>): <description>` (e.g. `feat(core): add substrate bus frame codec`). The allowed
types and the area taxonomy are defined by DF-RULE-015; this rule covers granularity only.

## Rationale

A coherent change is reviewable and reversible on its own. Splitting unrelated edits into separate
commits keeps `git bisect`, review, integration debugging and release notes honest while still
allowing one PR to deliver one coherent larger Request.

## Enforcement

The shared hook registry validates commit policy at deterministic commit/CI trigger points, and the
release capability consumes Conventional Commit metadata for release construction.

## Exceptions

Trivial mechanical changes (one-line typos, generated churn from deterministic generators) may stand
alone.

## Change control

The commit taxonomy lives in `015-repository-taxonomy.md`; do not restate the allowed scopes here.
