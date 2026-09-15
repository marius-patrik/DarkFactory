# ADR-0010 — df‑owned logins where import is one‑time adoption

**Status**: Accepted · 2026-09-15

## Context

Pipeline runs had used login files borrowed from other coding-agent CLIs, whose refresh tokens those CLIs also rotated.
The owner decided (2026-09-14):

> "we arent supposed to be borrwing anything we are supposed to have our own logins"

and refined it the same evening:

> "import should probably be possible but once we import something we dont need to care about refreshing the og site user can just reog there"

## Decision
All logins are owned by df; importing external tokens is a one‑time adoption, after which df manages refreshes.

## Alternatives rejected
- Borrowing CLI tokens for live use.
- Continuous syncing of external login stores.

## Consequences
- df never borrows another CLI's login; it uses its own managed accounts.
- `df account import` is a one‑time adoption; after import df owns the credentials and refreshes them independently.
