# ADR-0012 — Limit-aware task router with capability tiers

**Status**: Accepted · 2026-09-15

## Context

The owner made the router a first-class feature (2026-09-14):

> "FIRST-CLASS FEATURE: a model router that picks the model based on the task (task classification → capability/context/cost/limit-aware model choice), config-driven, alongside limit tracking."

Lanes then ran on hand-maintained provider chains with hand-edited exclusion lists. The owner decided that the chain
should not be maintained by hand at all (2026-09-15):

> "chain config should include every configured provider in fact the chain should be derived from provider configs where sensitive allowed can be true we can go further and make it data-collection and work based on that"

and that weak models should take the easy work (2026-09-15):

> "there should be a model tier config option so router can parse besides sensitive data what chunks route to what models and we dont waste tokens on easy tasks"

## Decision

- The router classifies each task and picks a model by capability, context window, cost and live quota. Availability
  comes only from the quota engine (ADR-0011).
- The candidate set is derived from every configured provider that has credentials or an anonymous transport.
  Explicit and graph-declared chains remain as overrides.
- Provider config declares its data collection policy (`none`, `logging`, `training` or `unknown`) together with its
  source. Sensitive work is routed only to providers whose policy the router allows. Routing fails closed: `unknown`
  is never allowed.
- Capability tiers are configurable and separate from the quota limit tier. A task's difficulty sets a minimum tier.
  The router prefers the lowest sufficient tier and escalates one tier after a failed attempt.

## Alternatives rejected

- **Hand-maintained chains and exclusion lists.** Every outage, new provider or new account needed a config edit, and
  the lists went stale while providers recovered or broke.
- **Always the strongest available model.** This spends scarce quota on easy tasks and leaves weaker free-tier models
  unused.
- **Admitting sensitive work unless a provider is known to collect data (fail open).** A provider with an unknown
  policy could receive sensitive content.

## Consequences

- Configuring a provider is enough for it to receive work. Taking it out of rotation is the quota engine's job, not a
  config edit.
- Sensitive work stops with an error when no configured provider has an allowed policy. It never falls back to one
  that does not.
- A failed attempt costs a retry one tier up, so difficulty estimates decide how much work weak models absorb.
