---
name: 013-specification-and-work-tracking
description: Use when deciding what to file, how to decompose work or where to track it: file issues for settled intent and executable work rather than open architecture debates, keep architecture questions with the owning product or ADR decision until settled, decompose by delivery independence rather than size, and keep the active Request and Planning record the single live work ledger.
id: DF-RULE-013
title: Specification sequence and work tracking
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [planning, epics]
license: MIT
---

# Rule 13 — Specification sequence and work tracking

## Requirement

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

## Rationale

Arguments converge in the document that owns the decision, while executable work converges in the
smallest useful tracking structure. This avoids both speculative issue sprawl and artificial
decomposition of tightly coupled work.

## Enforcement

- The documentation content graph validates the rule and ADR relations that the AGENTS projection is
  built from, and the projection is regenerated from those canonical sources.
- The `verify-bound-issue` required status check and project reconciliation enforce the active
  tracking relationships.

Nothing in the tree asserts the specification sequence itself. The requirement above is stated but
unverified by any test.

## Exceptions

None.

## Change control

Exact graph nodes and stage topology are owned by the declarable workflow graph. This rule owns only
the specification/tracking invariants.
