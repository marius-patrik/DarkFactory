---
name: commits-and-repository-taxonomy
description: Use when staging commits for a delivery, writing a commit message, adding an area label, or classifying a repository, package, domain or capability: keep each commit modular, focused and descriptive, preserve coherent commit boundaries when a session combines parallel worker output, use Conventional Commits with a declared base type, read commit scopes and labels from repo.dfconfig, and keep semantic domains separate from orthogonal capabilities.
title: Commits, commit boundaries and repository taxonomy
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [hooks, release, github]
license: MIT
---

# Commits, commit boundaries and repository taxonomy

## Requirement

Keep commits modular, focused, and descriptive — one commit per component or coherent change. A
single delivery PR may contain multiple coherent commits; one PR does not imply one commit. When an
integration/orchestrator session combines parallel worker output, preserve coherent commit boundaries
until the final merge rather than collapsing unrelated work into one opaque commit.

Commit syntax is Conventional Commits: `<type>(<scope>): <description>`.

Allowed base types are `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, and `ci`.

Repository area labels/scopes are declared by `repo.dfconfig`.

Project classification separates:

- ecosystem/toolchain;
- package;
- semantic domain (initially including code, paper and math);
- capability.

A repository may contain multiple packages, ecosystems and domains. Capabilities are orthogonal and may apply across domains.

Request classification, commit-scope validation and repository labels consume the same declared taxonomy rather than copied lists.

## Rationale

A coherent change is reviewable and reversible on its own. Splitting unrelated edits into separate
commits keeps `git bisect`, review, integration debugging and release notes honest while still
allowing one PR to deliver one coherent larger Request. Separating domain from capability preserves
multi-domain repositories while keeping extension behavior modular, and reading both commit scopes and
labels from the same declaration keeps the two from naming the same concern differently.

## Enforcement

The shared hook registry validates granularity-adjacent delivery policy at deterministic commit/CI
trigger points, and the release capability consumes the resulting commit metadata. The `repo.dfconfig`
resolver and canonical detection/capability resolution read the declared taxonomy.

The `conventional-commit` hook does not consult that taxonomy. It matches the commit type against its
own eleven-type regular expression, which is wider than the seven types this skill allows, and it
validates the scope only against `[a-z0-9][a-z0-9-]*` without consulting the declared areas. No check
compares a commit scope or an issue label against `repo.dfconfig`, so the requirement that both consume
the same declared taxonomy is unverified.

## Exceptions

Trivial mechanical changes (one-line typos, generated churn from deterministic generators) may stand
alone.

Consumers define their own repository areas and installed/applicable capabilities.

## Change control

The commit taxonomy lives in `repo.dfconfig`; do not restate the allowed scopes here. Taxonomy changes
occur through `repo.dfconfig`/capability declarations; this prose does not become a second list of
consumer-specific areas.
