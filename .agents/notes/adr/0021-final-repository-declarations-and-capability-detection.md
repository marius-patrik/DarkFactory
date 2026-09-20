# ADR-0021 — Final repository declarations and capability-driven detection

**Status**: Accepted · 2026-09-20

**Supersedes**: ADR-0001, ADR-0003, ADR-0004, ADR-0005 and ADR-0014 as implementation contracts.

## Context

Early DarkFactory decisions correctly established that repository identity is data, environments should be detected by default, domains sit above ecosystems, identities are declared rather than hard-coded and release policy belongs to repository configuration. Their first realization used `.darkfactory/manifest.json` plus Python helpers such as `manifest.py`, `environment.py` and `versioning.py`.

The final package/capability architecture and #340 hard transition replaced those concrete owners.

## Decision

- `repo.df` is the repository/product declaration.
- `config.df` is runtime/user/provider configuration.
- `docs.df` is documentation configuration.
- `repo.df` and `config.df` may live at the repository root or under `.darkfactory/`; both locations for the same logical file are an error.
- Legacy manifest/config paths are not read by the final system.
- Repository/package/ecosystem/domain evidence is detected by the TypeScript runtime. Versioned capabilities resolve behavior such as test, lint, format, docs, setup and release actions from that evidence.
- Domain and capability remain separate axes: domain states what kind of work a package represents; capability states what DarkFactory can do.
- Repository-specific identity, taxonomy and non-detectable policy live in `repo.df`, not hard-coded source.
- The canonical/default branch is discovered from repository state/configuration and is never assumed to be `main`.
- Version policy remains declarative where a repository needs it. DarkFactory first-party packages/capabilities use the lockstep SemVer contract defined by the PRD.
- Python manifest/environment/versioning helpers are historical implementation evidence only and are not final owners.

## Consequences

The valid principles from ADR-0001/0003/0004/0005/0014 remain, but their legacy file paths and Python ownership do not. New implementation work targets the final TypeScript package/capability owners directly.
