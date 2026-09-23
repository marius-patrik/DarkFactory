---
id: DF-RULE-001
title: Unit tests
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [ci]
---
# Rule 1 — Unit tests

## Requirement

Every change that adds or modifies behavior MUST be accompanied by corresponding tests at the appropriate package/capability boundary. Behavior is verified per change or pull request, not by an artificial test manufactured for every commit.

Applicable test actions come from the canonical repository/package detection plus capability-resolution contract. First-party TypeScript packages/capabilities use the normalized Bun test action. Retained non-TypeScript tooling uses its detected/capability-provided test action. All applicable suites MUST pass before a push is considered green.

## Rationale

Behavioral coverage is the durable artifact: it survives refactors and proves intent. Manufacturing a test for its own sake adds noise without coverage, so the unit of verification is the behavior change rather than the raw commit.

## Enforcement

`.github/workflows/ci.yml` asks df for the detected quality matrix and executes the normalized test/quality actions for applicable packages. CI does not maintain a second hard-coded ecosystem test list.

Tests live with or near the owning package/capability when practical; repository-level tests are reserved for cross-cutting governance/integration behavior.

## Exceptions

Documentation-only changes and generated files may carry no new tests when no behavior changes.

## Change control

The canonical detection/capability contract owns test-command selection. CI remains the authoritative execution environment.
