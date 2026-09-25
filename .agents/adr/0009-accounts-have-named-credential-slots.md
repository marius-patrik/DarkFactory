# ADR-0009 — Accounts have named credential slots

**Status**: Accepted

**Related rules**: `DF-RULE-014`, `DF-RULE-016`

## Decision

DarkFactory models credentials as:

`provider → accounts[] → named credential slots`.

An account may contain multiple required values such as access token, refresh token, API key, organization/project identifier, cookie or custom header.

## Consequences

Routing and quota state can address accounts independently. Runtime adapters receive the selected account view without collapsing DarkFactory's full credential model.
