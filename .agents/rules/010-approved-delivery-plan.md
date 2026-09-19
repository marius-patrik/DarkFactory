---
id: DF-RULE-010
title: Approved delivery plan
status: normative
applies_to: [agents, automation]
activation: always
owners: [merge-gates]
---
# Rule 10 — Reviewed Planning and implementation alignment

## Requirement

Before implementation begins, each governed unit of work MUST have one current unified Planning artifact.

Planning contains the semantic interpretation of the verbatim Request plus the evidence-justified implementation approach, dependencies, recovery inputs and verification expectations.

Planning MUST pass an independent review/fix loop until clean, followed by one explicit owner Planning Approval.

There is no separate interpretation approval gate and plan approval gate in the final lifecycle.

After implementation:

- deterministic verification runs;
- implementation review/fix loops until clean;
- material scope outside approved Planning requires the lighter scope-amendment approval;
- final alignment validates the implementation against approved Planning plus approved amendments;
- required checks/review/merge gates remain mandatory.

Planning approval becomes stale after a material Request/base/dependency/recovery-context change and cannot be silently reused.

## Rationale

One independently-reviewed Planning artifact preserves human intent while eliminating duplicate gates and repeated manual correction of invented plan details.

## Enforcement

#391 provides the durable Planning/review/fix lifecycle and shared review machinery.

## Exceptions

None.

## Change control

Stage topology may evolve, but one reviewed Planning approval before implementation and final alignment remain invariants.
