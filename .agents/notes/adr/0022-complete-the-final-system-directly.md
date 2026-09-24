# ADR-0022 — Complete the final system directly

**Status**: Accepted

## Decision

DarkFactory implementation targets the final architecture directly.

- Missing behavior is implemented in its final TypeScript package/capability owner.
- Duplicate production implementations are not maintained in parallel.
- The TypeScript production-engine completion/deletion gate comes before final release.
- Independent final-product work proceeds concurrently whenever interfaces are stable.
- The supported final release is published directly once the product surface is complete.
- That final release is then validated across the supported fleet.

## Consequences

Completion sequencing is optimized for the shortest safe path to final release, installed fleet acceptance and declarable-graph acceptance while preserving deterministic verification, governance and required product behavior.
