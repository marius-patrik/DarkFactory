# ADR-0015 — Deterministic engine results captured on stop with data‑collection routing

**Status**: Accepted · 2026-09-15

## Context

> "ideally models shouldnt need to call a tool at all to submit just do it when they stop working" – 2026-09-15

The deterministic engine must capture model results when the model stops, routing them through data‑collection aware pipelines.

## Decision

Model outputs are recorded automatically on stop, and the routing respects provider data‑collection policies.

## Alternatives rejected

- **Require explicit submit tool calls** – adds unnecessary friction for model developers.
- **Ignore data‑collection routing** – could violate privacy policies for certain providers.

## Consequences

- Engine owns deterministic steps, ensuring consistent capture of results.
- Provider data‑collection settings are enforced during routing.
