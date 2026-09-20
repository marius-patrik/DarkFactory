# ADR-0016 — Model resolution is live

**Status**: Accepted

## Decision

DarkFactory discovers usable models from configured provider catalogs/accounts at runtime.

Provider configuration contains the minimum information required to reach and authenticate to the provider. Routing uses live/cached catalog state plus quota/runtime outcomes rather than depending on hand-maintained model inventories.

## Consequences

Model availability can change without editing routing source. Invalid or unavailable models fall out of eligibility through the shared catalog/quota mechanisms.
