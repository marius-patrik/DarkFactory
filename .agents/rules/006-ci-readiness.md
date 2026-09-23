---
id: DF-RULE-006
title: CI readiness
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [ci]
---
# Rule 6 — CI readiness and verification

## Requirement

The canonical/default branch MUST remain green on its required checks. A red canonical branch is a
stop-the-line event for repository-wide delivery until restored.

A failing topic/recovery branch blocks that branch's merge and any dependent work, but does not
globally halt unrelated isolated branches whose own required checks are green.

CI MUST derive one normalized quality contract from detected packages plus applicable capabilities
and fail closed when that contract has an unresolved required gap, ambiguity or unsupported action.
Warnings are not an acceptable substitute for required test, typecheck, lint, format or documentation
coverage.

Type safety is a first-class required quality action for TypeScript packages. Every detected
first-party package/capability MUST be accounted for exactly once by an owning package action or an
explicit workspace-level action whose coverage can be proven. Incidental execution through a legacy
aggregate package does not count.

The aggregate required quality check is green only when every applicable required action for the
current head completed successfully. A required action that is missing, stale, cancelled, skipped or
neutral is not treated as proven success unless canonical configuration explicitly marks that action
not applicable before matrix construction.

CI validation MUST be read-only with respect to the delivery branch. Formatting and other
deterministic fixes happen in the governed mutation path before commit; CI reports drift rather than
pushing corrective commits.

Required checks are synchronized with branch protection and evaluated for the exact current head. A
branch may not merge while any required check or required invariant is red, missing, stale or
unevaluated.

## Rationale

A single green status is meaningful only when its underlying coverage is complete. Failing closed on
quality gaps prevents a package from escaping tests/typechecking simply because it forgot to declare a
script. Read-only CI also preserves exact-head evidence and avoids races with deterministic
orchestration.

## Enforcement

Generated/detected CI, package/capability action resolution, df check reconciliation and branch
protection enforce the required-check set. CI validates that every detected package has complete
required quality coverage before executing the matrix and rejects unresolved gaps.

## Exceptions

A quality action may be explicitly disabled/not-applicable only in the canonical repository/package
contract with a reason appropriate to that package. Absence of a script or tool is not by itself an
exception.

## Change control

Required-check ownership follows the canonical detected package/capability quality contract and
repository protection settings; no session may invent, silently drop or weaken required coverage.
