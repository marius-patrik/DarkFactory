# ADR-0013 — df runs the workflow graph

**Status**: Accepted

**Related rules**: `DF-RULE-010`, `DF-RULE-011`, `DF-RULE-012`, `DF-RULE-013`, `DF-RULE-014`, `DF-RULE-018`

## Decision

DarkFactory executes delivery as a declarative graph of agent, gate, automation and check-reference nodes with explicit edges and loop semantics.

Planning, implementation, review/fix, alignment and deterministic effects are orchestrated by the graph/runtime. Static CI checks may remain external and are observed through check-reference nodes.

The graph is the final execution owner. It is not yet the deployed one: the agent container's entrypoint is the Python runner, and no workflow or workflow template invokes `df graph dispatch`. Hand-over happens when the graph represents the behaviour the Python runner currently provides, which is the condition ADR-0022 sets for removing it. Until then the graph runtime, `packages/harness/assets/graph.darkfactory.json` and the `df graph` subcommands are real and validated, but the Python runner remains the current orchestrator of agent stages.

Execution is serializable per durable run identity. Concurrent ingress for the same run cannot execute the same transition concurrently or overwrite a newer persisted transition. External effects are separately serialized by deterministic effect identity and reconciled after ambiguous interruption.

## Consequences

Execution state is durable and resumable. Workflow topology has one declarative source rather than duplicated script orchestration, and duplicate/out-of-order ingress cannot create duplicate logical mutations.
