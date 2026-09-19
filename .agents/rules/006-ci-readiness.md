---
id: DF-RULE-006
title: CI readiness
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [system-audit]
---
# Rule 6 — CI readiness and verification

## Requirement

The canonical/default branch MUST remain green on its required checks. A red canonical branch is a stop-the-line event for repository-wide delivery until restored.

A failing topic/recovery branch blocks that branch's merge and any dependent work, but does not globally halt unrelated isolated branches whose own required checks are green. Parallel work is allowed when it cannot consume or hide the failing branch state.

Required checks are derived from the final normalized package/capability quality contract and synchronized with branch protection. A branch may not merge while any required check for its current head is red, missing or stale.

## Rationale

CI is authoritative for merge safety, but branch-local failure should not serialize unrelated work. The repository only needs global stop-the-line behavior when the canonical baseline itself is broken.

## Enforcement

Generated/detected CI plus branch protection and df reconciliation enforce the required-check set.

## Exceptions

None.

## Change control

Required-check ownership follows #341 and final CI/repository settings; no session may invent or silently drop checks.
