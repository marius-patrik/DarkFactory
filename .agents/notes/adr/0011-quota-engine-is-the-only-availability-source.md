# ADR-0011 — Quota engine as the only availability source

**Status**: Accepted · 2026-09-15

## Context

Lanes had been discovering capacity by sending probe requests, spending the free tiers' tiny request budgets. The owner
decided (2026-09-14):

> "there is like a 5 request rate limit this is stupid way to reach it we need a proper quota engine in df"

> "for all providers"

## Decision
Make the quota engine the sole source of availability information for all providers.

## Alternatives rejected
- Rely on ad‑hoc probing of provider endpoints to infer availability.
- Use static configuration without live quota tracking.

## Consequences
- Declared limits live in provider config; df counts every request it sends and learns limits from headers, errors and usage endpoints, shared across processes on the machine.
- All availability decisions are driven by the quota engine's declared limits and live usage accounting.
- No blind probes are used; the engine provides a unified status surface for lanes, router, and board.
