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

Formatting is not a review topic — it is automated. `rustfmt` for Rust, the workspace formatter
(`bun format` when the TypeScript foundation lands) for TypeScript, and `black` (line length 100)
for Python automation. The GitHub Actions bot formats the codebase on every push across branches and
commits any adjustments. Lints are blocking: `cargo clippy -D warnings` today, the Bun-native lint
gate after the workspace lands.

## Rationale

Deterministic formatting removes style disagreement from review and from agent loopback, so a model
never normalizes the tree by hand during an implementation pass.

## Enforcement

- `.github/workflows/auto-format.yml` reformats on every push.
- Formatting and lint gates are required jobs in `ci.yml`.

## Exceptions

Formatting gates apply to source languages present in the tree; generated artifacts are excluded
where declared.

## Change control

The tool list is legacy where it predates the TS/Bun workspace; the target formatter/linter/test
set is the Bun-native one after `cli-release` lands.