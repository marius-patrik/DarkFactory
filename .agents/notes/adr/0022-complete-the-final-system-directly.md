# ADR-0022 — Complete the final system directly

**Status**: Accepted

## Decision

DarkFactory implementation targets the final architecture directly.

- Missing behavior is implemented in its final TypeScript package/capability owner.
- Duplicate production implementations are not maintained in parallel.
- #359 is the core production-engine completion/deletion gate.
- Independent final-product work proceeds concurrently whenever interfaces are stable.
- #360 publishes the final release directly.
- #361 validates that final release across the fleet.

## Consequences

Completion sequencing is optimized for the shortest safe path to #360, #361 and #68 while preserving deterministic verification, governance and required product behavior.
