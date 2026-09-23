---
id: DF-RULE-008
title: Formatting and linting
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [tests-audit]
---
# Rule 8 — Automated formatting and linting

## Requirement

Formatting is deterministic automation, not a review topic.

The canonical detection + capability-resolution contract determines the formatter/linter for each detected package/ecosystem. First-party TypeScript workspace packages use the canonical Biome configuration; other ecosystems use their declared/detected capability actions.

Formatting/linting commands MUST be derived from the same normalized package/capability result used by local verification and CI. Do not maintain a second workflow-specific command map.

The mutation path applies deterministic formatting before creating a commit. CI validates the resulting tree but MUST NOT asynchronously create/push formatter commits that advance an active delivery branch after the orchestrator has integrated or proven a head.

Lints are blocking where supported. Generated artifacts are excluded only by explicit canonical policy.

## Rationale

One detected quality contract keeps local mutation, graph verification and CI from disagreeing about what “formatted” or “lint clean” means. Applying formatting before commit also prevents background automation from racing lease-safe integration or invalidating exact-head evidence.

## Enforcement

Local verification, the hooks capability and generated CI consume the same action model.

## Exceptions

Unsupported/missing quality actions are diagnosed explicitly; they are not silently treated as passing.

## Change control

Formatter/tool changes are reviewed capability/package configuration changes.
