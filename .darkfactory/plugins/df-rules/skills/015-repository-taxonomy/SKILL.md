---
name: 015-repository-taxonomy
description: Use when a change to DarkFactory must satisfy DF-RULE-015, Commits, repository taxonomy and domains.
id: DF-RULE-015
title: Commits, repository taxonomy and domains
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [github, hooks]
license: MIT
---

# Rule 15 — Commits, repository taxonomy and domains

## Requirement

Commits use Conventional Commits: `<type>(<scope>): <description>`.

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

Separating domain from capability preserves multi-domain repositories while keeping extension behavior modular.

## Enforcement

The repo.dfconfig resolver and canonical detection/capability resolution read the declared taxonomy.

The `conventional-commit` hook does not. It matches the commit type against its own eleven-type
regular expression, which is wider than the seven types this rule allows, and it validates the scope
only against `[a-z0-9][a-z0-9-]*` without consulting the declared areas. No check compares a commit
scope or an issue label against `repo.dfconfig`, so the requirement that both consume the same
declared taxonomy is unverified.

## Exceptions

Consumers define their own repository areas and installed/applicable capabilities.

## Change control

Taxonomy changes occur through repo.dfconfig/capability declarations; rule prose does not become a second list of consumer-specific areas.
