# ADR-0016 — Live model resolution and lane orchestration as a df graph

**Status**: Accepted · 2026-09-15

## Context

> "Live model resolution: a model poller finds every usable model of every provider from minimal provider config … No hand‑maintained model lists; usability comes from catalog metadata plus learned outcomes" – 2026-09-15

And "orchestration via graph": lane orchestration moves into df as a workflow graph run by df.

The system must resolve models live and orchestrate lanes through a df graph.

## Decision

Implement live model resolution combined with graph‑based lane orchestration.

## Alternatives rejected

- **Static model lists** – would become stale and break routing.
- **Separate orchestration scripts** – would duplicate logic and lose graph benefits.

## Consequences

- Model availability is evaluated at runtime, improving reliability.
- The orchestration graph becomes the central execution engine for lanes.
