# ADR-0022 — Complete the final system directly

**Status**: Accepted · 2026-09-20

## Context

Earlier completion planning used terms such as shadow verification, parity, cutover, canary and migration while the TypeScript df engine coexisted with legacy Python orchestration.

The owner clarified that DarkFactory should reach the final version as quickly as possible and that no supported production-migration phase is required.

## Decision

- There is no required dual-engine compatibility period, Python-vs-df parity phase, shadow-production phase, staged cutover, rollback compatibility layer or migration-tooling milestone.
- Legacy Python and historical recovery branches are evidence used to avoid losing required behavior; they are not compatibility targets.
- Missing behavior is implemented directly in its final TypeScript package/capability owner.
- Once a final owner covers a legacy responsibility, the legacy owner is deleted or made unreachable rather than maintained in parallel.
- #359 is the rebuilt-engine completion/deletion gate, not a migration program.
- Independent final-product work proceeds in parallel whenever interfaces are stable; it does not wait merely for sequencing ceremony.
- There is no canary/pre-release phase. #360 publishes the actual final release directly.
- #361 validates installation/update and product behavior using that final release across the fleet.

## Consequences

Completion work is optimized for the shortest safe path to the final #360/#361/#68 state. Tests, workflows, adapters or docs that exist only to preserve obsolete production compatibility are removed rather than modernized.
