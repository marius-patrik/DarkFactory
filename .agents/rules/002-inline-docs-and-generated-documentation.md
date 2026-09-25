---
id: DF-RULE-002
title: Inline documentation and generated documentation
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

Documentation MUST be generated from canonical source and architecture records. DarkFactory's documentation engine is `@darkfactory/docs`; TypeDoc may be used internally for TypeScript extraction. The `docs` block of the combined DarkFactory configuration is the only documentation configuration contract. Generated sites and JSON content graphs are CI outputs and MUST NOT be committed.

`.agents/PRD.md` is the product-documentation homepage. `.agents/rules/**` is the canonical rule set and `.agents/adr/**` is the canonical current long-term note set. Root `README.md` is a symlink to the canonical product document; `.agents/AGENTS.md` is a deterministic generated projection of the canonical rules. These discovery surfaces are never authorities and are never edited directly. Repository/tool discovery aliases may point to canonical documents or generated projections only when they serve a current external/conventional entry point; aliases remain links rather than copied authored documents, and unsupported legacy aliases are forbidden. CI MUST fail on deterministic projection drift and on missing/orphaned rule↔note relations.

The final web rendering layer is `@darkfactory/web`; docs must not maintain a second frontend or theme runtime.

## Rationale

One content graph can publish product docs, rules and notes without turning generated projections into competing authorities. Canonical records stay in their owning directories while generated indexes and supported discovery aliases make them accessible.

## Enforcement

Docs/API/projection checks consume the canonical capability-aware detection contract and first-party docs compiler. Required API surfaces build with zero required documentation warnings; `.agents/AGENTS.md` must match its canonical rules, the root `README.md` alias must target the canonical product document, and generated site/JSON output must remain ignored and CI-only.

## Exceptions

Generated or intentionally private/internal symbols may be excluded only by the canonical docs/export policy.

## Change control

Presentation belongs to the shared web package; source extraction/content ownership belongs to the docs package/capabilities.
