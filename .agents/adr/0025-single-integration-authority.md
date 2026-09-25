# ADR-0025 — Each delivery branch has one integration authority

**Status**: Accepted

**Related rules**: `DF-RULE-005`, `DF-RULE-007`, `DF-RULE-019`

## Decision

Parallel implementation uses one authoritative remote delivery branch writer.

- The orchestrator alone advances the authoritative delivery branch and owns integration.
- Parallel workers use isolated local worktrees/branches with explicit prerequisites and disjoint subsystem/path ownership.
- Workers return coherent commits, changed-file sets, targeted verification and assumptions; they do not mutate the authoritative remote branch.
- Shared integration surfaces remain orchestrator-owned unless one non-overlapping edit is explicitly delegated.
- Dependent work begins only after its consumed interface is integrated and verified.
- CI is read-only on delivery branches.
- Each implementation gate records exact-head evidence before downstream work treats it as satisfied.
- Coherent commit boundaries are preserved; one PR does not imply one opaque squash commit.

## Consequences

Parallelism improves throughput without introducing lost updates, shared-file races or evidence attached to obsolete heads. Integration authority may be transferred explicitly, but there is never more than one active authority for one delivery branch.
