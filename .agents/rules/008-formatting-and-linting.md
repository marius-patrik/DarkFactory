---
id: DF-RULE-008
title: Formatting and linting
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [tests-audit]
---
# Rule 8 — Automated formatting and linting

## Requirement

Formatting is not a review topic — it is automated. `rustfmt` for Rust, Biome (`harness/biome.json`)
for TypeScript, and `black` (line length 100) for Python automation. The GitHub Actions bot formats
the codebase on every push across branches and commits any adjustments. Lints are blocking:
`cargo clippy -D warnings` for Rust and `biome ci` for TypeScript. Until the one-time full harness
reformat lands, Biome formats and checks the TypeScript files a change touches.

## Rationale

Deterministic formatting removes style disagreement from review and from agent loopback, so a model
never normalizes the tree by hand during an implementation pass.

## Enforcement

- `.github/workflows/auto-format.yml` reformats on every push.
- Formatting and lint gates are required jobs in `ci.yml` (the `harness` job runs `biome ci`).

## Exceptions

Formatting gates apply to source languages present in the tree; generated artifacts are excluded
where declared.

## Change control

Changing a formatter or its configuration (`harness/biome.json`, black's line length) is a
reviewed change; the one-time full reformat lands as its own pull request (plans/repository-truth.md Q1).