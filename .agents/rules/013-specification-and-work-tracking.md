---
id: DF-RULE-013
title: Specification and work tracking
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [workflow-graph]
---
# Rule 13 — Specification sequence and when issues may exist

## Requirement

Specification proceeds in one direction, and each stage is locked before the next begins:

```text
PRD.md  →  ADRs (.agents/notes/adr/)  →  issues
```

- **An issue may only be filed for work that is settled.** Settled means one of two things: an
  approved ADR resolving the decision the work depends on, or a concrete mechanical task whose
  outcome is not in question (for example, "create the Bun workspace and add these named
  dependencies").
- **Speculative epic and decision issues are prohibited.** Filing an issue for an unanswered
  question moves the argument into the tracker, where it fragments across comment threads instead of
  converging in the document that owns it. Open questions live in the issues and the workflow graph,
  not in a document that competes with the tracker.
- **Large settled bodies of work** are tracked as `epic`-labelled issues: containers carrying the
  scope statement, the acceptance criteria for the area, and a checklist of child `Request` issues.
  Epics are never implemented directly — only their children are.
- The workflow graph, GitHub parent/sub-issue relationships, and project fields are the work
  ledger; no separate planning document shadows them.

## Rationale

Arguments converge in the document that owns the question. Work that is not settled is not yet
trackable, and a second planning ledger is exactly the drift ROADMAP-style documents produced.

## Enforcement

- `tests/test_governance.py` asserts the specification sequence and the settled-only rule appear in
  AGENTS.md.
- PRD section 13 restates the same sequence for product decisions.

## Exceptions

None.

## Change control

Exact nodes, edges, and stage sequence are owned by `workflow-graph` (issue #68); this rule holds
the invariants and links to the graph.