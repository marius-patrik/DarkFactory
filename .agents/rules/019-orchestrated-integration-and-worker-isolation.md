---
id: DF-RULE-019
title: Orchestrated integration and worker isolation
status: normative
applies_to: [agents, automation]
activation: always
owners: [planning, git, ci]
---
# Rule 19 — Orchestrated integration and worker isolation

## Requirement

Parallel implementation has one integration authority per delivery branch.

- The orchestrator alone advances the authoritative remote delivery branch and owns integration.
- Parallel workers use isolated local worktrees/branches with explicit prerequisites and disjoint
  subsystem/path ownership. They do not create competing remote delivery branches/PRs or mutate the
  integration branch.
- Shared integration surfaces (root manifests/lockfiles, package export maps, workflow/config,
  PRD/PLAN/rules/docs and generated projections) stay orchestrator-owned unless one non-overlapping
  edit is explicitly delegated.
- Workers return a coherent commit SHA, changed-file set, targeted verification and assumptions.
  The orchestrator integrates those commits in dependency order, resolves shared files semantically
  and re-runs affected gates.
- A dependent lane starts only after the interface it consumes is integrated and verified on the
  authoritative branch. Do not parallelize across unsettled shared interfaces.
- Keep coherent Conventional Commit boundaries. One delivery PR does not justify one opaque commit.
- CI is read-only on delivery branches; background automation does not race the orchestrator by
  pushing formatter/fix commits.
- Each implementation gate records exact-head evidence before downstream work treats it as satisfied.

## Rationale

Parallelism is useful only when ownership and integration are deterministic. A single remote writer
plus isolated workers prevents lost updates, shared-file races and evidence attached to obsolete
heads.

## Enforcement

Worktree/branch ownership, lease-safe git mutation, commit/evidence handoff, exact-head CI and final
alignment enforce the integration model.

## Exceptions

A human may explicitly transfer integration authority, but there is still only one active integration
owner for a delivery branch at a time.

## Change control

The concrete worker implementation may change; single integration authority, isolation and
exact-head evidence are invariants.
