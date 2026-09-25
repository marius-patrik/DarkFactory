# ADR-0028 — Integrate the Paper as a repository domain

**Status**: Accepted

**Related rules**: `DF-RULE-020`

## Decision

- Import the current file heads from `marius-patrik/DarkFactory-Paper@f6a54b14a3980dc7e8eea366509e451557a85efe` under `paper/` without importing Paper Git history.
- Keep `paper/index.typ` as the sole authored manuscript and its bibliography, fonts, and images as its supporting resources.
- Generate the root `README.md` and `paper/ODBORNA_PRACE.pdf` through the Paper publication command; keep `.agents/PRD.md` as the product documentation home.
- Keep Paper-specific governance in the repository rule set and the root product requirements; do not create a subordinate Paper PRD or a second Paper AGENTS file.
- Detect and validate the Paper through the existing capability and release contracts.
- Exclude the standalone Paper web application, workflows, lockfile, submodule, and history. Migrate the web workbench into the shared web architecture in a later dependent delivery.

## Consequences

DarkFactory has one Paper manuscript and publication owner, while its product documentation and shared web architecture retain their existing final owners. The Paper can be reviewed, built, and released from the monorepo without retaining the standalone repository as a second product.
