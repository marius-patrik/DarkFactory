# ADR-0011 — The quota engine is the availability authority

**Status**: Accepted

## Decision

Provider/model/account availability is determined by DarkFactory's quota engine.

The engine combines declared limits with observed response headers, usage data, errors and provider usage endpoints. Routing does not spend requests merely to probe availability.

Capacity admission is authoritative state, not an advisory preflight. Concurrent model calls reserve request/token/concurrency capacity atomically before dispatch and settle or release that reservation from observed usage. Corrupt or unreadable authoritative quota state fails closed rather than being interpreted as empty usage.

## Consequences

All routing and operator status surfaces consume one availability model. Quota accounting is shared across processes and supports deterministic wait/skip/failover behavior without concurrent calls consuming the same remaining capacity.
