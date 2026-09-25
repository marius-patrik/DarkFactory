# ADR-0012 — Routing is limit-aware and capability-tiered

**Status**: Accepted

**Related rules**: `DF-RULE-014`

## Decision

The router selects candidates using task kind, required capabilities, context, sensitivity/data policy, live quota and configured capability tiers.

- Provider eligibility is evaluated before model strength.
- The lowest sufficient capability tier is preferred.
- Failure escalation moves deterministically to a stronger eligible tier.
- Explicit graph/CLI routing remains an override subject to hard eligibility/capacity constraints.

## Consequences

Lightweight models can serve appropriate work without consuming scarce high-capability capacity, while sensitive and capability-constrained work still fails closed.
