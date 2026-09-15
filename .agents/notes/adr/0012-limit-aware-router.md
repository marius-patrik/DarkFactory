# ADR-0012 — Limit-aware task router and capability tiers

**Status**: Accepted · 2026-09-15

## Context

> "FIRST-CLASS FEATURE: a model router that picks the model based on the task (task classification → capability/context/cost/limit-aware model choice), config-driven, alongside limit tracking." – 2026-09-14

The router must consider per‑model limits and choose the lowest capable tier, escalating only when needed.

## Decision

The system will implement a limit‑aware router that classifies tasks and selects models from configurable capability tiers.

## Alternatives rejected

- **Static model selection** – would ignore quota limits and cause frequent failures.
- **Single‑tier routing** – lacks flexibility to use weaker models for simple tasks.

## Consequences

- Models are routed based on capability and live limit data, reducing quota exhaustion.
- Capability‑tier configuration adds complexity to the router.
