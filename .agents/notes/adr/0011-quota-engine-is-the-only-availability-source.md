# ADR-0011 — The quota engine is the availability authority

**Status**: Accepted

## Decision

Provider/model/account availability is determined by DarkFactory's quota engine.

The engine combines declared limits with observed response headers, usage data, errors and provider usage endpoints. Routing does not spend requests merely to probe availability.

## Consequences

All routing and operator status surfaces consume one availability model. Quota accounting is shared across processes and supports deterministic wait/skip/failover behavior.
