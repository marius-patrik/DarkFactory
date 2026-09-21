---
enforced_by: [tests-touched]
id: DF-RULE-014
title: Agent runtime and resilience
status: normative
applies_to: [agents, automation]
activation: always
owners: [rotation]
---
# Rule 14 — Capability-driven agent runtime and resilience

## Requirement

DarkFactory runs agentic work through the TypeScript df runtime, not a final Python harness registry.

- Core owns execution, routing primitives and persistence/resume; `@darkfactory/capability` owns capability discovery/loading/resolution.
- Agentic/product behaviors are versioned capabilities.
- One canonical capability implementation may generate native Pi, MCP and supported agent skill/plugin adapters.
- Pipeline stages pass explicit task kind where known; undeclared inference separates subject from required capability.
- Provider/account/model selection respects sensitivity, data-collection policy, capability requirements, quotas and capability tiers.
- Exhaustion/failure moves through the configured eligible failover chain without repeating deterministic effects.
- Every logical agent stage has one bounded elapsed-time budget across model failover and tools.
- Natural model stop is accepted; mutation truth comes from observed effects.
- Quota/provider interruption checkpoints durable state and resumes without duplicating completed effects.
- CI agent execution remains containerizable/non-root.

## Rationale

The runtime should be resilient and harness-portable without duplicating product behavior for each external agent implementation.

## Enforcement

Core/router/runtime tests plus capability adapter tests and live df-only acceptance.

## Exceptions

Retained Python orchestration is deletion/reference-only until its final TypeScript owner lands and is never an extension or compatibility target.

## Change control

Provider/model/account data lives in final configuration/keychain/catalog owners; this rule defines runtime behavior only.