---
name: 002-inline-docs-and-generated-documentation
description: Use when a change to DarkFactory must satisfy DF-RULE-002, Inline documentation and generated documentation.
id: DF-RULE-002
title: Inline documentation and generated documentation
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [docs, ci]
license: MIT
---

# Rule 2 — Inline documentation and generated documentation

## Requirement

Public source APIs MUST be documented inline.

- **TypeScript**: TSDoc on every exported public symbol in first-party packages and capabilities.
- **Rust**: `///` documentation on public items, including error/panic behavior where applicable.

Documentation MUST be generated from canonical source and architecture records. DarkFactory's documentation engine is `@darkfactory/docs`; TypeDoc may be used internally for TypeScript extraction. The `docs` block of the combined DarkFactory configuration is the only documentation configuration contract. Generated sites and JSON content graphs are CI outputs and MUST NOT be committed.

`README.md` is the product-documentation homepage: a regular file at the repository root, not a symlink or a projection. `.agents/plugins/df-rules/skills/**` is the canonical rule set, one skill per rule, and `ADRs.md` is the canonical current long-term note set. These discovery surfaces are never a second declaration of the same content.

The final web rendering layer is `@darkfactory/web`; docs must not maintain a second frontend or theme runtime.

## Rationale

One content graph can publish product docs, rules and notes without turning generated projections into competing authorities. Canonical records stay in their owning directories while generated indexes and supported discovery aliases make them accessible.

## Enforcement

Docs/API/projection checks consume the canonical capability-aware detection contract and first-party docs compiler. Required API surfaces build with zero required documentation warnings; every rule skill must satisfy the shared skill validator, and the root `README.md` alias must target the canonical product document, and generated site/JSON output must remain ignored and CI-only.

## Exceptions

Generated or intentionally private/internal symbols may be excluded only by the canonical docs/export policy.

## Change control

Presentation belongs to the shared web package; source extraction/content ownership belongs to the docs package/capabilities.
