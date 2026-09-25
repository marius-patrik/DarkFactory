# ADR-0026 — Verification proves invariants and fails closed

**Status**: Accepted

**Related rules**: `DF-RULE-001`, `DF-RULE-006`, `DF-RULE-008`

## Decision

Tests and CI prove product/architecture invariants rather than freezing incidental repository shape.

- Behavioral tests live at the owning package/capability boundary and survive valid refactors.
- Static tests inspect semantic structure—parsed declarations/workflows, schemas, import/dependency graphs, public exports or generated artifacts—when static structure is the actual contract.
- Exact filenames, source substrings, internal symbol names and workflow step labels are not normally product invariants.
- Duplicate/shadowed tests are invalid verification.
- Concurrency/idempotency/atomicity tests exercise simultaneous actors and crash/failure windows.
- Typecheck is a first-class TypeScript quality action.
- CI fails closed on missing, unsupported, ambiguous or stale required quality actions and accounts for every detected first-party package/capability exactly once.
- Required skipped/neutral/missing/stale checks are not treated as proven success unless they were explicitly declared not applicable before matrix construction.
- CI validates but does not mutate delivery branches; deterministic formatting/fixes happen before the governed commit.
- Release proof executes the built/source-free candidate rather than substituting source-workspace imports.

## Consequences

A green head means the declared invariants were actually evaluated. The suite remains useful during aggressive cleanup because it protects behavior and architecture rather than stale implementation text.
