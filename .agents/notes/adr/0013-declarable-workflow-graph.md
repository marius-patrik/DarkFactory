# ADR-0013 — Declarable workflow graph with separate self‑review runs

**Status**: Accepted · 2026-09-15

## Context

> "orchestration via graph": lane orchestration moves into df as a workflow graph run by df — picking the next Request, splitting it into single‑purpose chunks, implementing each chunk, verifying, scope/plan‑alignment review with a loop back on findings, commit, PR and merge gate. – 2026-09-15

The workflow graph must be declarable and support distinct self‑review iterations.

## Decision

Implement a declarable workflow graph where each self‑review run is a separate df execution.

## Alternatives rejected

- **Inline self‑review loop** – would tie review to a single long‑running process, reducing visibility.
- **Separate scripts per stage** – would fragment orchestration and hinder graph visualisation.

## Consequences

- Self‑review runs are independent, enabling clearer logging and easier retries.
- The graph definition becomes a central artifact that must be kept in sync with the code.
