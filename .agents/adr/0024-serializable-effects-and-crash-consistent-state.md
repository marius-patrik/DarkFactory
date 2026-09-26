# ADR-0024 — Effects are serializable and authoritative state is crash-consistent

**Status**: Accepted

**Related rules**: `DF-RULE-018`

## Decision

DarkFactory correctness is defined across duplicate delivery, concurrent execution, interruption and ambiguous external-write outcomes.

- Authoritative transitions serialize at the identity they mutate: run, effect, account, branch/worktree, quota reservation, release and other durable state.
- Check-then-act is insufficient without an atomic claim, lease, transaction or compare-and-set.
- A deterministic effect identity produces at most one logical external mutation, including concurrent duplicate invocation.
- After an ambiguous non-idempotent write outcome, DarkFactory reconciles current external state before retrying.
- Remote mutation uses expected-old-version/SHA semantics where available and fails closed on stale state.
- Multi-file logical state commits through one generation/transaction boundary.
- Lock recovery cannot remove another owner's replacement lock.
- Replicated state converges independent of merge direction and represents deletion until stale replicas can no longer resurrect it.
- Concurrency/idempotency/atomicity claims are tested with simultaneous actors and injected failures at real durable boundaries, not only sequential replay after success.

## Consequences

Crash recovery and concurrency safety are one protocol rather than separate best-effort features. Advisory telemetry may use weaker durability only when it cannot authorize work, affect mutation truth, consume capacity authority or change reconciliation decisions.
