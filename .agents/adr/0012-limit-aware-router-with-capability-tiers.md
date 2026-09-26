# ADR-0012 — Routing is limit-aware and capability-tiered

**Status**: Accepted

**Related rules**: `DF-RULE-014`

## Decision

The router selects candidates using task kind, required capabilities, context, sensitivity/data policy, live quota and configured capability tiers.

- Provider eligibility is evaluated before model strength.
- The lowest sufficient capability tier is preferred.
- Failure escalation moves deterministically to a stronger eligible tier.
- Explicit graph/CLI routing remains an override subject to hard eligibility/capacity constraints.

Tier ranking is a configured mechanism, not a built-in table. The router ranks against the `capabilityTiers` list declared in the `router` block of the combined configuration, and `--min-tier` is validated against that same list. A repository that declares no `capabilityTiers` gets no tier ranking: the router falls back to the default tier and every candidate is treated as equally ranked.

## Consequences

Lightweight models can serve appropriate work without consuming scarce high-capability capacity, while sensitive and capability-constrained work still fails closed.
