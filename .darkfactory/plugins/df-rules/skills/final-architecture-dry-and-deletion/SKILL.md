---
name: final-architecture-dry-and-deletion
description: Use when adding, moving or replacing code, configuration, docs or commands: give every concern one final owner, delete the previous owner and dead code instead of keeping compatibility, fallback or alias layers, abstract only repeated mechanisms at the lowest stable owner, keep exports intentional and helpers private, and keep dependencies acyclic.
title: Final architecture, DRY, and deletion
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [core, capability]
license: MIT
---

# Final architecture, DRY, and deletion

## Requirement

The repository targets the current final architecture directly.

- Every concern has one final owner and one source of truth. Duplicate implementations, registries,
  state stores, config contracts, command maps and generated/manual copies are forbidden.
- Reuse or move working code when it already implements the required behavior, but delete its old
  owner once the final owner is live. Final packages MUST NOT forward implementation to a
  deletion-bound/legacy tree.
- Internal backward-compatibility, migration, parity, shadow, canary, fallback and alias layers are
  forbidden unless an **external supported contract explicitly required by `README.md`** needs them.
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

`packages/harness/test/ci/repository-governance.test.ts` verifies that the first-party package dependency graph
read from package manifests is closed and acyclic, and the documentation currentness check rejects
retired documentation paths and broken discovery aliases.

Neither is reachability analysis. No tool in this repository walks the source import graph, so
unreachable first-party code and source-level dependency cycles are not detected, and the duplicate
and deletion-bound ownership this rule prohibits is caught by review rather than by a check.

## Exceptions

Only an external compatibility promise explicitly present in the PRD/accepted ADRs may survive. It
must have a named owner and invariant tests; internal migration convenience is not an exception.

## Change control

Changing a final owner or adding an external compatibility promise is an architecture change and
requires the normal PRD/ADR process.
