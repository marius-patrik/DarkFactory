# ADR-0016 — Model resolution is live

**Status**: Accepted

**Related rules**: `DF-RULE-014`

## Decision

DarkFactory discovers usable models from configured provider catalogs/accounts at runtime.

Provider configuration contains the minimum information required to reach and authenticate to the provider. Routing uses live/cached catalog state plus quota/runtime outcomes to decide which models are usable. A declared default chain is an ordered preference list, not an inventory of what exists: each entry is still resolved against the live catalog and quota, and an entry whose model is absent or unavailable falls out of eligibility rather than being routed to.

## Consequences

Model availability can change without editing routing source. Invalid or unavailable models fall out of eligibility through the shared catalog/quota mechanisms.
