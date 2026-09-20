---
id: DF-RULE-003
title: Product requirements and ADRs
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [pr206, merge-gates]
---
# Rule 3 — Product requirements and ADRs

## Requirement

`PRD.md` is the single normative product requirements document. Current Request bodies define approved feature-specific behavior. Accepted ADRs record durable architectural decisions and rationale.

Executable declarations use the final DarkFactory contracts:

- `repo.df` for repository/product declaration;
- `config.df` for runtime/user/provider configuration;
- `docs.df` for native documentation configuration;
- the declarable workflow graph for execution topology;
- `.agents/rules/*.md` for mandatory contribution/governance behavior.

Only the current `repo.df`, `config.df`, and `docs.df` contracts are normative.

A material deviation from PRD MUST be owner-approved and recorded as an accepted numbered ADR before implementation.

## Rationale

Stable requirements, executable declarations and decision history have separate owners so no generated view can silently override product intent.

## Enforcement

Governance checks ensure PRD remains the single normative product document and architecture changes are represented by ADRs.

## Exceptions

None.

## Change control

Planning/graph/package/capability changes update the owning Request/ADR/PRD rather than creating parallel specification files.
