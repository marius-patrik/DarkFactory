# ADR-0022 — Complete the final system directly

**Status**: Accepted

**Related rules**: `DF-RULE-003`, `DF-RULE-013`, `DF-RULE-017`, `DF-RULE-019`

## Decision

DarkFactory implementation targets the final architecture directly.

- Missing behavior is implemented in its final TypeScript package/capability owner.
- Useful existing TypeScript is moved/reused rather than rewritten solely to change ownership.
- Duplicate production implementations are not maintained in parallel.
- Internal backward-compatibility, migration, parity, shadow, canary, fallback and alias layers are forbidden unless an external supported contract explicitly required by `PRD.md` needs them.
- Previous internal architecture is not a compatibility target and is never kept "just in case".
- Dead/unreachable code, stale configuration, unused assets, obsolete tests, superseded docs and transitional adapters are deleted rather than documented or tested into permanence.
- Shared mechanisms are abstracted once at the lowest stable owner when repetition represents the same invariant; speculative abstraction and API widening solely for tests are avoided.
- Legacy DarkFactory Python and deletion-bound harness ownership are removed once their required behavior is represented by final owners; they are not maintained as parity/fallback paths.
- Independent final-product work proceeds concurrently whenever consumed interfaces are stable.
- Tightly coupled final completion work may be consolidated into one owner-approved Request/Planning record and one integration PR instead of being artificially split into child delivery PRs.
- Before that final integration PR merges, an unpublished source-free release candidate built from its exact head/tree is validated through the complete DarkFactory acceptance and declared consumer-fleet acceptance.
- Known defects found by exact-head/fleet acceptance are fixed on the integration branch and re-proven before merge.
- Final supported publication occurs from canonical after merge without introducing behavioral source changes; publication must reproduce the proven candidate behavior/assets aside from canonical provenance metadata.

## Consequences

Completion sequencing is optimized for the shortest safe path to one final, proven merge. The repository remains current-only and small: unsupported internal history lives in Git/issues rather than compatibility code, and fleet defects cannot be deferred into a post-merge stabilization phase.
