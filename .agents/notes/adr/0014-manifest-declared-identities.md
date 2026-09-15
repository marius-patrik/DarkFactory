# ADR-0014 — Manifest‑declared identities and checks outside the graph

**Status**: Accepted · 2026-09-15

## Context

> "Identities MUST be manifest-defined (Patrik reiterated 2026-09-13): every provider identity (name, email/trailer, note text, account link) lives in the DarkFactory manifest; no hard‑coded identities in code." – 2026-09-13

Checks that operate outside the workflow graph must also be declared in the manifest.

## Decision

All identities and external checks are defined in the repository manifest, not in code, and are invoked outside the main workflow graph.

## Alternatives rejected

- **Hard‑coding identities** – would duplicate information and hinder portability.
- **Embedding checks in the graph** – mixes concerns and makes external validation harder to audit.

## Consequences

- The manifest becomes the single source of truth for identities and external checks.
- Tooling must read the manifest to discover identities and apply checks before graph execution.
