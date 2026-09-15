# ADR-0008 — Providers fully config‑driven

**Status**: Accepted · 2026-09-15

## Context

From the decision record of 2026-09-13 (prompts/_decisions.md, orchestrator workspace):

> "Provider layer must be fully abstracted: NO per‑provider code; every provider (endpoints, API dialect, auth method and credential slots, headers, model‑list endpoint, quota/error mapping) is defined in config, driven by generic dialect adapters." — 2026-09-13

## Decision
Make the provider layer entirely driven by configuration files; no provider‑specific code exists in the codebase.

## Alternatives rejected
- Implement per‑provider adapters hard‑coded in the harness.
- Allow provider‑specific logic in the runtime.

## Consequences
- No per‑provider code; all provider endpoints, dialects, authentication, credential slots, headers, model‑list endpoints, and quota/error mappings are defined in configuration.
- The system can add new providers simply by adding a config entry.
