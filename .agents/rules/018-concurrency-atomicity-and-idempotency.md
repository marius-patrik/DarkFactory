---
id: DF-RULE-018
title: Concurrency, atomicity, and idempotency
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [core, git, github, keychain]
---
# Rule 18 — Concurrency, atomicity, and idempotency

## Requirement

Authoritative state and external effects MUST remain correct under duplicate delivery, concurrent
execution, interruption and ambiguous transport failure.

- Serialize authoritative transitions at the identity they mutate (run, effect, account, branch,
  worktree, quota reservation, release, etc.). Check-then-act without an atomic claim/lease/CAS is not
  sufficient.
- A deterministic external effect ID may produce at most one logical mutation. Concurrent duplicates
  cannot both enter the mutation; crash recovery reconciles observed external state before retrying.
- Remote writes use expected-old-version/SHA or equivalent conditional semantics and fail closed on
  stale state.
- Mutation retries are method/effect aware. After an ambiguous write outcome, reconcile first; never
  blindly replay a non-idempotent POST/write because a transport or 5xx response failed.
- Authoritative file/state updates are crash-consistent. Multi-file logical state uses one
  generation/transaction boundary; lock recovery cannot delete a replacement owner's lock.
- Replicated state converges deterministically regardless of merge direction and represents deletion
  explicitly until it is safe to compact.
- Quota/capacity is reserved atomically before concurrent work is dispatched and settled from observed
  usage.
- Webhook/events are triggers, not authoritative snapshots; reconciliation derives desired state from
  current evidence so stale/out-of-order events cannot roll state backward.
- Concurrency, idempotency and atomicity claims are tested at the actual race/crash windows with
  simultaneous actors and fault injection.

## Rationale

Sequential happy-path tests do not prove exactly-once or crash-safe behavior. DarkFactory coordinates
remote repositories and concurrent agents, so its correctness boundary is the transaction/effect
protocol rather than a single function call.

## Enforcement

Runtime/effect-journal, git/GitHub, storage, auth/keychain, quota and release tests exercise duplicate
concurrent invocation, stale leases, ambiguous writes and injected interruption at durable boundaries.

## Exceptions

Advisory telemetry/cache data may use weaker durability only when it cannot authorize work, affect
mutation truth, consume quota authority or change reconciliation decisions, and that weaker contract
is explicit.

## Change control

New authoritative stores/effects must define identity, serialization, durable boundaries,
reconciliation and retry semantics before implementation.
