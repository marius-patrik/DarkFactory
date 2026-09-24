---
id: DF-RULE-013
title: Specification sequence and work tracking
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [planning, epics]
---
# Rule 13 — Specification sequence and work tracking

## Requirement

Specification proceeds in one direction, and each stage is settled before implementation depends on
it:

```text
PRD.md  →  accepted ADRs when a durable architecture decision is required  →  Request/Planning
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
- `PLAN.md` may record repository-wide strategy and dependency order, but it is not a second live
  work ledger. Concrete current implementation steps, checkboxes, approvals and evidence live in the
  active Request/Planning record plus the workflow graph/GitHub/project state.

## Rationale

Arguments converge in the document that owns the decision, while executable work converges in the
smallest useful tracking structure. This avoids both speculative issue sprawl and artificial
decomposition of tightly coupled work.

## Enforcement

- `tests/test_governance.py` asserts the specification sequence and Request/Planning invariants are
  represented in the AGENTS projection.
- Request/Epic/project reconciliation enforces the active tracking relationships.

## Exceptions

None.

## Change control

Exact graph nodes and stage topology are owned by the declarable workflow graph. This rule owns only
the specification/tracking invariants.
