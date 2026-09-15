# ADR-0016 — Live model resolution

**Status**: Accepted · 2026-09-15

## Context

Provider configs listed model ids by hand. Ids went stale or were configured wrongly, and routing then sent work to
models that did not exist. The owner decided (2026-09-15):

> "for the wrong configured models thats why we want live resolution we should design the model poller in a way so that it finds any usable model from any provider with minimal required details in config"

## Decision

- A model poller finds every usable model of every configured provider. It needs only minimal provider config: id,
  API dialect, base URL and auth.
- Usability comes from the provider's catalog metadata plus outcomes the quota engine has learned, such as a model
  that is not found or not supported (ADR-0011).
- Provider configs need no model lists. Model ids a config still declares are checked against the live listing, and
  ids the provider no longer lists are reported as stale.

## Alternatives rejected

- **Hand-maintained model lists in provider config.** They drift from what each provider actually serves, and one
  stale id is enough to break routing.
- **Probing each model with a request.** This spends the small request budgets of free tiers that ADR-0011 protects.

## Consequences

- Adding a provider means declaring how to reach it. Its models appear once the poller has read the catalog.
- A model that disappears from a catalog, or keeps failing, leaves routing without a config edit.
- Routing depends on the provider's live catalog, which the poller reads per account.
