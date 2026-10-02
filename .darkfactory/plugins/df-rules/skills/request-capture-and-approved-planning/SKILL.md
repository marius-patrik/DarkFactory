---
name: request-capture-and-approved-planning
description: Use when a task arrives that needs implementation, or when scope changes: represent it as tracked GitHub Requests first and preserve the user's verbatim wording, decompose only genuinely independent work, produce one current unified Planning artifact, run an independent review and fix loop until clean, obtain one explicit owner Planning Approval, treat that approval as stale after material Request, base, dependency or recovery change, and validate final alignment against approved Planning.
title: Verbatim Request capture, Planning and approval
status: normative
applies_to: [agents, automation]
activation: always
owners: [planning, review, github]
license: MIT
---

# Verbatim Request capture, Planning and approval

## Requirement

Every incoming governed task MUST be represented by one or more tracked GitHub Requests before
implementation.

- Preserve the user's verbatim wording.
- Decompose genuinely independent tasks; do not split tightly coupled architecture solely to satisfy one-PR/one-issue assumptions.
- When the owner consolidates previously separate Requests into one current Request, copy the relevant verbatim owner direction and all still-current required behavior into the consolidated Request before closing duplicates.
- Resolve Request/Epic/dependency/recovery relationships explicitly.
- Produce one unified Planning artifact from the verbatim Request and authoritative context.
- Subsequent delivery remains bound to the active Request(s) or an explicitly approved shared-Planning record.

Planning contains the semantic interpretation of the verbatim Request plus the evidence-justified
implementation approach, dependencies, recovery inputs and verification expectations.

Before implementation begins, each governed unit of work MUST have one current unified Planning
artifact.

Planning MUST pass an independent review/fix loop until clean, followed by one explicit owner
Planning Approval.

There is no separate `Interpretation` approval lifecycle before Planning, and no separate
interpretation approval gate and plan approval gate in the final lifecycle. There is exactly one
review/approval/alignment lifecycle.

After implementation:

- deterministic verification runs;
- implementation review/fix loops until clean;
- material scope outside approved Planning requires the lighter scope-amendment approval;
- final alignment validates the implementation against approved Planning plus approved amendments;
- required checks/review/merge gates remain mandatory.

Planning approval becomes stale after a material Request/base/dependency/recovery-context change and
cannot be silently reused.

## Rationale

Verbatim capture protects intent, and one independently-reviewed Planning artifact preserves that
intent while eliminating duplicate gates and repeated manual correction of invented plan details.
Consolidation is safe only when it preserves intent before older tracking records become historical.
The bootstrap exception below prevents a broken Planning engine from making its own repair
impossible without weakening the normal lifecycle.

## Enforcement

Request intake and the governed Planning/review/fix lifecycle provide the durable Planning artifact
and shared review machinery, and validate the capture contract. Bootstrap use must be explicit in
the active Request and delivery PR.

## Exceptions

For an owner-authorized bootstrap/completion repair of the governed lifecycle itself, one tracked
Request may temporarily serve as the unified Planning artifact when it contains the verbatim intent,
implementation steps, dependencies and verification gates; an independent review is recorded before
implementation; and the owner explicitly authorizes execution. The same deterministic verification,
review/fix, alignment, required-check and final merge authorization rules still apply, and verbatim
capture and owner approval are not waived. This exception expires as soon as df can represent the
work normally.

## Change control

Stage topology may evolve, but verbatim Request coverage, one reviewed Planning approval before
implementation and final alignment remain invariants. Multi-Request/shared-Planning behavior follows
the first-class Request relationship model and never waives explicit Request coverage.
