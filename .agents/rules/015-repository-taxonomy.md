---
id: DF-RULE-015
title: Repository taxonomy
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [system-audit, cli-release]
---
# Rule 15 — Conventional commits and taxonomy enforcement

## Requirement

- **Format**: `<type>(<scope>): <description>` (e.g. `feat(term): add cell matrix buffer`).
- **Allowed Types**: `feat`, `fix` (mapped from `bug`), `chore`, `docs`, `refactor`, `test`, `ci`.
- **Allowed Area Scopes & Labels**:
  The taxonomy is **per repository**, declared in `.darkfactory/manifest.json` under `areas`. The
  labels, the permitted commit scopes, and the agent's request classifier all read that one
  declaration, so the three cannot drift apart. A repository adopting this pipeline replaces the
  block with its own domains; the areas below are DarkFactory's own.
  - `area:agents`: Harness orchestration, provider adapters, personas, approvals.
  - `area:governance`: Agent rules, branch protection, required checks, project board taxonomy.
  - `area:release`: Versioning modes, tagging, asset packaging, release notes.
  - `area:docs`: Documentation site, theme, architecture notes.
  - `area:ci`: GitHub Actions workflows, containers, runner scripts, repository automation.

## Rationale

The manifest is the executable source; the rule text is a convenience mirror for DarkFactory itself
and must not be copied verbatim to consumers, whose areas differ.

## Enforcement

- `.darkfactory/manifest.json` `areas` declaration is the source of truth.
- `tests/test_pipeline_config.py::test_area_lists_match_the_manifest` checks the request template
  and the PR template against the manifest.

## Exceptions

Consumers override the area block with their own declaration.

## Change control

Add or rename an area by changing the manifest only; commit scopes and labels follow automatically.
Thin-rule counterpart of DF-RULE-005 (granularity).