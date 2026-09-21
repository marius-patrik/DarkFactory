---
enforced_by: [request-binding]
id: DF-RULE-009
title: Issue binding, branch auto-deletion, and board status
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [system-audit]
---
# Rule 9 — Request binding, branch cleanup and board status

## Requirement

Every delivery PR MUST explicitly bind every Request it satisfies.

A PR may satisfy one Request or multiple Requests when the shared-plan/multi-Request model proves that each bound Request has valid independent or shared Planning/gate coverage. Epic membership or stack topology never implies completion by itself.

Merged delivery branches are cleaned up when safe. A branch with unique unrepresented recovery/stack work is not deleted merely because another PR merged.

Request/PR/project status uses one canonical reconciliation model with the seven states:

- `Backlog`
- `ToDo`
- `In Progress`
- `Blocked`
- `Done`
- `Superseded`
- `Dropped`

A Request reaches Done only from its own terminal evidence or explicit valid shared-plan/multi-Request completion.

## Rationale

Explicit bindings preserve the reason a PR exists while permitting coherent multi-Request/Epic delivery without duplicating implementation.

## Enforcement

The Request/Epic/stack/GitHub capabilities reconcile PR bindings, project status and branch cleanup.

## Exceptions

None.

## Change control

Relationship semantics belong to the first-class Request/Epic/stack model, not ad-hoc PR text parsing.