---
id: DF-RULE-009
title: Issue binding, branch auto-deletion, and board status
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [system-audit]
---
# Rule 9 — Request binding, branch cleanup and board status

## Requirement

Every delivery PR MUST explicitly bind every **active** Request it satisfies.

A PR may satisfy one Request or multiple Requests when the shared-Planning/multi-Request model proves
that every active bound Request has valid Planning/gate coverage. Epic membership or stack topology
never implies completion by itself.

When the owner deliberately consolidates tightly coupled work into one current Request, the
consolidated Request MUST first preserve the current required behavior and relevant verbatim owner
direction. Earlier duplicate Requests are then closed as historical traceability and do not need to
remain separately bound by the delivery PR.

Failures already associated with a delivery PR/Request MUST be recorded as check/run evidence and on
that bound work rather than creating a new implementation Request. A standalone unbound/default-branch
operational failure may use one deduplicated incident record when durable follow-up is required.

Merged delivery branches are cleaned up when safe. A branch with unique unrepresented recovery/stack
work is not deleted merely because another PR merged.

Request/PR/project status uses one canonical reconciliation model with the seven states:

- `Backlog`
- `ToDo`
- `In Progress`
- `Blocked`
- `Done`
- `Superseded`
- `Dropped`

A Request reaches Done only from its own terminal evidence or explicit valid shared-Planning/
multi-Request completion.

Webhook/event payloads are triggers, not authoritative lifecycle snapshots. Before mutating status,
labels, project fields, PR bindings or branch cleanup, reconciliation MUST derive the desired state
from current GitHub/runtime evidence. Delayed or out-of-order events must be idempotent and must not
roll a newer status backward.

## Rationale

Explicit current bindings preserve why a PR exists without forcing superseded duplicate issues to
remain active. Failure evidence stays attached to the work that owns it instead of fragmenting the
tracker. Treating events as triggers prevents concurrent label/project events from overwriting newer
repository truth with stale webhook state.

## Enforcement

The Request/Epic/stack/GitHub capabilities reconcile PR bindings, project status, failure evidence
and branch cleanup.

## Exceptions

None.

## Change control

Relationship semantics belong to the first-class Request/Epic/stack model, not ad-hoc PR text
parsing.
