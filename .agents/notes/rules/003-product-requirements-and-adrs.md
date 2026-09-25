---
id: DF-RULE-003
title: Product requirements and ADRs
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [planning, docs]
---
# Rule 3 — Product requirements and ADRs

## Requirement

`.agents/PRD.md` is the single normative product requirements document. Current active Request/Planning records define approved feature-specific behavior and executable delivery scope. Accepted ADRs record durable architectural decisions and rationale.

Executable declarations use the final DarkFactory contracts:

- canonical root `repo.df` for the combined configuration, with root `config.df` accepted as the same logical document;
- the `repo` block for repository/product declaration;
- the `providers` block for runtime/user/provider configuration;
- the `docs` block for native documentation configuration;
- the declarable workflow graph for execution topology;
- `.agents/notes/rules/*.md` for mandatory contribution/governance behavior.

`DF_CONFIG_DIR` (default `.darkfactory`) may hold the same combined document for supported discovery, but `.darkfactory` is not a committed source in this repository. Ambiguous root/folder or alias candidates fail closed and are never merged.

A material deviation from `.agents/PRD.md` MUST be owner-approved and recorded as an accepted numbered ADR before implementation.

Long-term notes and normative rules form one bidirectional current-truth graph:

- every accepted ADR MUST declare the canonical rules it explains or constrains;
- every canonical rule MUST be backed by at least one current accepted ADR explaining its durable rationale;
- unknown, missing or orphaned links are documentation-currentness failures;
- superseded/historical decisions are removed from the live notes/rules graph and remain in Git/GitHub history instead.

## Rationale

Stable requirements, executable declarations and current architecture decisions have separate owners so no generated view can silently override product intent.

## Enforcement

Governance/docs-currentness checks ensure PRD remains the single normative product document, architecture changes are represented by ADRs, and rule/note relationships are complete in both directions.

## Exceptions

None.

## Change control

Planning/graph/package/capability changes update the active Request/Planning record, accepted ADRs and PRD as applicable rather than creating parallel specification files.
