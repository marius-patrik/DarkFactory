---
id: DF-RULE-001
title: Unit tests
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [tests-audit]
---
# Rule 1 — Unit tests

## Requirement

Every change that adds or modifies code, classes, or methods MUST be accompanied by corresponding
tests. Behavior is verified per change or per pull request, not by an artificial test manufactured
for every commit. Rust code is tested with `cargo test`, TypeScript with `bun test`, and repository
automation (`.github/scripts/`) with `pytest`. All applicable suites MUST pass before a push is
considered green.

## Rationale

Behavioral coverage is the durable artifact: it survives refactors and proves intent. Manufacturing
a test for its own sake adds noise without coverage, so the unit of verification is the change or
pull request rather than the raw commit.

## Enforcement

- `.github/workflows/ci.yml` runs the Python, Rust, and TypeScript/JavaScript/docs jobs on every
  push.
- `tests/` keyed per subsystem; governance behavior is pinned by `tests/test_governance.py`,
  pipeline behavior by `tests/test_pipeline_config.py`.

## Exceptions

Documentation-only changes and generated files may carry no new tests when no behavior changes.

## Change control

Target command is `bun test`; the path is owned by `cli-release` (TS/Bun foundation) and
`tests-audit`. CI remains the authoritative execution environment.