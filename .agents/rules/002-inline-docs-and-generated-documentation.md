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

`docs/home.md` is the product-documentation homepage. `AGENTS.md` is the generated/indexed projection of canonical `.agents/rules/**`. Root `README.md` is the generated index/projection of current long-term `.agents/notes/**`. These surfaces have distinct roles and MUST NOT duplicate one another. CI MUST fail on deterministic projection drift.

The final web rendering layer is `@darkfactory/web`; docs must not maintain a second frontend or theme runtime.

## Rationale

One content graph can publish product docs, rules and notes without turning README into a second product specification. Canonical records stay in their owning files while generated projections make them discoverable.

## Enforcement

Docs/API/projection checks consume the canonical capability-aware detection contract and first-party docs compiler. Required API surfaces build with zero required documentation warnings; README/AGENTS projections must match their canonical notes/rules.

## Exceptions

Generated or intentionally private/internal symbols may be excluded only by the canonical docs/export policy.

## Change control

Presentation belongs to the shared web package; source extraction/content ownership belongs to the docs package/capabilities.
