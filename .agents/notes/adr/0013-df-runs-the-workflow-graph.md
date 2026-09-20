# ADR-0013 — df runs the workflow graph

**Status**: Accepted

## Decision

DarkFactory executes delivery as a declarative graph of agent, gate, automation and check-reference nodes with explicit edges and loop semantics.

Planning, implementation, review/fix, alignment and deterministic effects are orchestrated by the graph/runtime. Static CI checks may remain external and are observed through check-reference nodes.

## Consequences

Execution state is durable and resumable. Workflow topology has one declarative source rather than duplicated script orchestration.
