---
id: DF-RULE-017
title: Final architecture, DRY, and deletion
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [core, capability]
---
# Rule 17 — Final architecture, DRY, and deletion

## Requirement

The repository targets the current final architecture directly.

- Every concern has one final owner and one source of truth. Duplicate implementations, registries,
  state stores, config contracts, command maps and generated/manual copies are forbidden.
- Reuse or move working code when it already implements the required behavior, but delete its old
  owner once the final owner is live. Final packages MUST NOT forward implementation to a
  deletion-bound/legacy tree.
- Internal backward-compatibility, migration, parity, shadow, canary, fallback and alias layers are
  forbidden unless an **external supported contract explicitly required by PRD.md** needs them.
  Previous internal architecture is never a compatibility target and is not preserved "just in case".
- Delete unreachable/dead code, stale configuration, unused assets, obsolete tests, superseded docs,
  abandoned feature flags and transitional adapters instead of documenting or testing their presence.
- Abstract repeated mechanisms and invariants once at the lowest stable owner. Do not create
  speculative abstractions for one caller or hide unrelated behavior behind a generic helper merely
  to reduce line count.
- Public exports are intentional product/extension contracts. Keep internal helpers private; tests do
  not justify widening an API.
- Package/capability dependencies remain explicit and acyclic. Historical implementation belongs in
  Git/issues, not live source.

## Rationale

A small current-only architecture is easier to reason about, test and change. Compatibility code for
unsupported internal history multiplies states and slows final delivery without protecting a user
contract.

## Enforcement

Dependency/reachability analysis, package-boundary tests, current-truth docs checks and final
repository audits reject duplicate/deletion-bound ownership and unexplained unreachable first-party
code.

## Exceptions

Only an external compatibility promise explicitly present in the PRD/accepted ADRs may survive. It
must have a named owner and invariant tests; internal migration convenience is not an exception.

## Change control

Changing a final owner or adding an external compatibility promise is an architecture change and
requires the normal PRD/ADR process.
