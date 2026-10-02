---
name: product-requirements-adrs-and-work-tracking
description: Use when changing product requirements, executable declarations or durable architecture decisions, and when deciding what to file or how to decompose work: keep README.md the single normative product document, record durable decisions as accepted numbered ADRs in ADRs.md, keep specification sequencing one-directional, file issues for settled intent rather than open architecture debates, and keep the active Request and Planning record the single live work ledger.
title: Product requirements, ADRs and work tracking
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [planning, docs, epics]
license: MIT
---

# Product requirements, ADRs and work tracking

## Requirement

`README.md` is the single normative product requirements document. Current active Request/Planning records define approved feature-specific behavior and executable delivery scope. Accepted ADRs record durable architectural decisions and rationale. They live in one document, `ADRs.md`, authored at `.darkfactory/ADRs.md` and symlinked at the repository root, one `## ADR-NNNN — Title` record per decision.

A material deviation from `README.md` MUST be owner-approved and recorded as an accepted numbered ADR before implementation.

Specification proceeds in one direction, and each stage is settled before implementation depends on
it:

```text
README.md  →  accepted ADRs when a durable architecture decision is required  →  Request/Planning
```

- **Issues track settled intent and executable work, not unresolved architecture debates.** An issue
  may be filed when its required outcome is settled by the PRD/accepted ADRs or when it is a concrete
  mechanical task whose outcome is not in question.
- **Open architecture questions stay with the owning product/ADR decision until settled.** Do not
  create speculative decision issues merely to move an unresolved argument into the tracker.
- **Decomposition follows delivery independence, not size alone.** A large tightly coupled body of
  settled work may remain one Request/Planning record and one delivery PR when the owner explicitly
  chooses one coherent integration/validation contract. Do not manufacture child Requests merely to
  satisfy a process shape.
- **Use an Epic when genuinely independent child Requests benefit from separate lifecycle,
  ownership, sequencing or delivery.** Epic relationships organize Requests; they are not mandatory
  wrappers around every large change and never waive child Planning/evidence when children exist.

The active Request/Planning record is the single live work ledger. Concrete current implementation
steps, checkboxes, approvals and evidence live there with the workflow graph and GitHub/project
state.

Executable declarations use the final DarkFactory contracts:

- canonical root `repo.dfconfig` for the combined configuration, with root `config.dfconfig` and root `.dfconfig` accepted as the same logical document;
- the `repo` block for repository/product declaration;
- the `providers` block for runtime/user/provider configuration;
- the `docs` block for native documentation configuration;
- the declarable workflow graph for execution topology;
- `.darkfactory/plugins/df-rules/skills/` for mandatory contribution/governance behavior, one skill per governed concern.

`DF_CONFIG_DIR` (default `.darkfactory`) may hold the same combined document for supported discovery, but `.darkfactory` is not a committed source in this repository. Ambiguous root/folder or alias candidates fail closed and are never merged.

Superseded/historical decisions are removed from the live note set and remain in Git/GitHub history
instead.

## Rationale

Stable requirements, executable declarations and current architecture decisions have separate owners
so no generated view can silently override product intent. Arguments converge in the document that
owns the decision, while executable work converges in the smallest useful tracking structure. That
avoids both speculative issue sprawl and artificial decomposition of tightly coupled work.

## Enforcement

Governance/docs-currentness checks ensure PRD remains the single normative product document, and that
architecture changes are represented by ADRs. The documentation content graph validates the ADR
records the AGENTS projection is built from, and the projection is regenerated from those canonical
sources. The `verify-bound-issue` required status check and project reconciliation enforce the active
tracking relationships.

Nothing in the tree asserts the specification sequence itself. The requirement above is stated but
unverified by any test.

## Exceptions

None.

## Change control

Planning/graph/package/capability changes update the active Request/Planning record, accepted ADRs and
PRD as applicable rather than creating parallel specification files. Exact graph nodes and stage
topology are owned by the declarable workflow graph; this skill owns only the specification/tracking
invariants.
