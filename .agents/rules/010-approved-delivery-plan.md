---
id: DF-RULE-010
title: Approved delivery plan
status: normative
applies_to: [agents, automation]
activation: always
owners: [merge-gates]
---
# Rule 10 — Pre-implementation planning and plan review

## Requirement

Before implementation begins on any task, the implementation plan MUST be posted as a comment on the
same `Request` issue and approved there. The plan MUST detail objectives, architectural and code
changes, and verification steps.

Both approval gates remain: the interpretation is approved before a plan is written, and the plan is
approved before any code is. One unit of work is one issue, so a pull request binds one thing and
closing it closes one thing.

- **Implementation Review Gate**: Prior to merging the bound pull request, an implementation review
  MUST be conducted and commented on the same issue, confirming the implementation matches the plan
  exactly (`Matches Plan: Yes`).
- **Plan Alignment**: If the implementation diverged from the plan, an alignment comment
  (`Plan Alignment:`) detailing all deviations MUST be posted and explicitly approved before the
  pull request can be merged. CI enforces the presence of both the plan and the pre-merge review on
  all bound issues.

## Rationale

Two human gates — interpretation and plan — prevent scope drift before code exists; the review gate
proves delivered code matches what was approved.

## Enforcement

- `.github/scripts/agent_runner.py` implements the two-gate flow and the review loop.
- `tests/test_governance.py` asserts the interpretation/plan markers exist in AGENTS.md.
- `ci.yml` checks bound issues carry plan and review.

## Exceptions

None.

## Change control

Wording evolves with `merge-gates`; node topology belongs to `workflow-graph`. This rule keeps the
invariants, not the stage diagram.