---
id: DF-RULE-002
title: Inline docstrings and generated documentation
status: normative
applies_to: [agents, automation, contributors]
activation: always
owners: [docs-site, tests-audit]
---
# Rule 2 — Inline docstrings and generated documentation

## Requirement

All source MUST carry complete API documentation inline:

- **Rust**: `///` doc comments on every public item, with `# Errors` and `# Panics` sections where
  applicable. `cargo doc` MUST build with zero warnings.
- **TypeScript**: TSDoc on every exported symbol.
- **Python** (automation): Google-style docstrings (`Args:`, `Returns:`, `Raises:`) with PEP 484
  type annotations.

Documentation MUST be generated from source and hand-written architecture notes. No static
per-module markdown mirror and no manually maintained documentation index are stored in the
repository. All documentation builds MUST succeed with `properdocs build --strict` — zero warnings,
zero errors — and deploy automatically to GitHub Pages.

## Rationale

A committed documentation mirror creates two sources of truth that drift. Generating the site from
the canonical files means the published pages and the repository content cannot disagree.

## Enforcement

- `.github/scripts/docs_hooks.py` maps canonical files to virtual pages at build time; the docs
  build is a required status check in `ci.yml`.
- `properdocs.yml` configures the strict build.

## Exceptions

None.

## Change control

Docs-site owns generated presentation, selection of the installed sites, and the mandatory-rule
projection. The Python hooks are port-source, not an extension target, per `cli-release` and PRD
section 10.