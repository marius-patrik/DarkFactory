---
id: DF-RULE-010
title: Reviewed Planning and implementation alignment
status: normative
applies_to: [agents, automation]
activation: always
owners: [planning, review]
---
# Rule 10 — Reviewed Planning and implementation alignment

## Requirement

Before implementation begins, each governed unit of work MUST have one current unified Planning
artifact.

Planning contains the semantic interpretation of the verbatim Request plus the evidence-justified
implementation approach, dependencies, recovery inputs and verification expectations.

Planning MUST pass an independent review/fix loop until clean, followed by one explicit owner
Planning Approval.

There is no separate interpretation approval gate and plan approval gate in the final lifecycle.

After implementation:

- deterministic verification runs;
- implementation review/fix loops until clean;
- material scope outside approved Planning requires the lighter scope-amendment approval;
- final alignment validates the implementation against approved Planning plus approved amendments;
- required checks/review/merge gates remain mandatory.

Planning approval becomes stale after a material Request/base/dependency/recovery-context change and
cannot be silently reused.

If the governed Planning implementation itself is unavailable or is the component being repaired,
only the narrow bootstrap/completion exception below may substitute an owner-authorized tracked
Request as the temporary Planning record.

## Rationale

One independently-reviewed Planning artifact preserves human intent while eliminating duplicate gates
and repeated manual correction of invented plan details. The bootstrap rule prevents a broken
Planning engine from making its own repair impossible without weakening the normal lifecycle.

## Enforcement

The governed Planning/review/fix lifecycle provides the durable Planning artifact and shared review
machinery. Bootstrap use must be explicit in the active Request and delivery PR.

## Exceptions

For an owner-authorized bootstrap/completion repair of the governed lifecycle itself, one tracked
Request may temporarily serve as the unified Planning artifact when it contains the verbatim intent,
implementation steps, dependencies and verification gates; an independent review is recorded before
implementation; and the owner explicitly authorizes execution. The same deterministic verification,
review/fix, alignment, required-check and final merge authorization rules still apply. This exception
expires as soon as df can represent the work normally.

## Change control

Stage topology may evolve, but one reviewed Planning approval before implementation and final
alignment remain invariants.
