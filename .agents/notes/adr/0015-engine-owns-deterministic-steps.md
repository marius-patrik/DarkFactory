# ADR-0015 — The engine owns deterministic steps

**Status**: Accepted

## Decision

DarkFactory owns deterministic workspace and delivery effects, including repository state inspection, checkout/update operations, scope verification, commits, pushes, pull-request operations and deterministic verification.

Models perform judgement and file edits. Natural model stop is valid completion. Code-result truth is derived from observed workspace/effect state; judgement results may be structurally extracted after the model stops.

## Consequences

Models are not required to print control JSON, perform git operations or submit completion tools. Mutation and completion claims are backed by observed effects.
