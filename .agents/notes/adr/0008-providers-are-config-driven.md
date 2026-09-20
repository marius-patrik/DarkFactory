# ADR-0008 — Providers are configuration-driven

**Status**: Accepted

## Decision

Provider behavior is declared through configuration and generic dialect/runtime mechanisms.

Provider declarations cover endpoints, API dialect, authentication, credential slots, headers, model discovery and quota/error mapping. Provider-specific behavior does not get its own independent orchestration subsystem.

## Consequences

Adding or changing a provider is primarily a configuration/data change. Shared runtime mechanisms own transport, routing, authentication integration and failure handling.
