# ADR-0015 — The engine owns deterministic steps

**Status**: Accepted

**Related rules**: `DF-RULE-007`, `DF-RULE-018`

## Decision

DarkFactory owns deterministic workspace and delivery effects, including repository state inspection, checkout/update operations, scope verification, commits, pushes, pull-request operations and deterministic verification.

Models perform judgement and file edits. Natural model stop is valid completion. Code-result truth is derived from observed workspace/effect state; judgement results may be structurally extracted after the model stops.

Remote mutation uses observed evidence and conditional semantics. Git pushes identify the expected old remote SHA and the new local SHA, refuse stale remote state and verify the resulting ref. Ambiguous write outcomes are reconciled before retry rather than blindly replayed.

## Consequences

Models are not required to print control JSON, perform git operations or submit completion tools. Mutation and completion claims are backed by observed effects, and deterministic retries cannot silently duplicate or overwrite newer external state.
