---
id: DF-RULE-012
title: Request capture and confirmation
status: normative
applies_to: [agents, automation]
activation: always
owners: [merge-gates]
---
# Rule 12 — Verbatim Request capture and Planning gate

## Requirement

Every incoming governed task MUST be represented by one or more tracked GitHub Requests before
implementation.

- Preserve the user's verbatim wording.
- Decompose genuinely independent tasks; do not split tightly coupled architecture solely to satisfy one-PR/one-issue assumptions.
- When the owner consolidates previously separate Requests into one current Request, copy the relevant verbatim owner direction and all still-current required behavior into the consolidated Request before closing duplicates.
- Resolve Request/Epic/dependency/recovery relationships explicitly.
- Generate one unified Planning artifact from the verbatim Request and authoritative context.
- Independently review/fix Planning until clean.
- Require one explicit owner Planning Approval before implementation.
- Subsequent delivery remains bound to the active Request(s) or an explicitly approved shared-Planning record.

There is no final separate `Interpretation` section/gate that must be approved before Planning can
exist.

## Rationale

Verbatim capture protects intent; reviewed Planning protects interpretation and implementation
approach without serializing two redundant human approvals. Consolidation is safe only when it
preserves intent before the older tracking records become historical.

## Enforcement

Request intake and the governed Planning lifecycle validate the contract.

## Exceptions

The bootstrap/completion exception in DF-RULE-010 may use the active Request itself as the temporary
Planning record while the normal Planning implementation is under repair. It does not waive verbatim
capture or owner approval.

## Change control

Multi-Request/shared-Planning behavior follows the first-class Request relationship model and never
waives explicit Request coverage.
