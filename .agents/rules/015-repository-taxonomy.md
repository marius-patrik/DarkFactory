---
id: DF-RULE-015
title: Commits, repository taxonomy and domains
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [github, hooks]
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

The repo.dfconfig resolver, canonical detection/capability resolution and hooks validate the taxonomy.

## Exceptions

Consumers define their own repository areas and installed/applicable capabilities.

## Change control

Taxonomy changes occur through repo.dfconfig/capability declarations; rule prose does not become a second list of consumer-specific areas.
