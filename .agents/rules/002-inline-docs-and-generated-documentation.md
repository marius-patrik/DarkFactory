---
id: DF-RULE-002
title: Inline docstrings and generated documentation
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [docs, ci]
---
# Rule 2 — Inline documentation and generated documentation

## Requirement

Public source APIs MUST be documented inline.

- **TypeScript**: TSDoc on every exported public symbol in first-party packages and capabilities.
- **Rust**: `///` documentation on public items, including error/panic behavior where applicable.
- **Python**: any retained Python tooling exposes typed Google-style docstrings on public helpers.

Documentation MUST be generated from canonical source and architecture records. DarkFactory's documentation engine is `@darkfactory/docs`; TypeDoc may be used internally for TypeScript extraction. `docs.df` is the only DarkFactory documentation configuration contract.

The same canonical homepage/content graph MUST render both the published docs homepage and committed `README.md`. CI MUST fail on deterministic README projection drift.

The final web rendering layer is `@darkfactory/web`; docs must not maintain a second frontend or theme runtime.

## Rationale

One content graph prevents API docs, README and the published site from becoming independent sources of product truth.

## Enforcement

Docs/API/README checks consume the canonical capability-aware detection contract and first-party docs compiler. Required API surfaces build with zero required documentation warnings.

## Exceptions

Generated or intentionally private/internal symbols may be excluded only by the canonical docs/export policy.

## Change control

Presentation belongs to the shared web package; source extraction/content ownership belongs to the docs package/capabilities.
