# ADR-0021 — Repository declarations, runtime detection and capability-resolved actions

**Status**: Accepted

**Related rules**: `DF-RULE-003`, `DF-RULE-006`, `DF-RULE-015`

## Decision

- `repo.df` is the repository/product declaration.
- `config.df` is runtime/user/provider configuration.
- `docs.df` is documentation configuration.
- `repo.df` and `config.df` may live at repository root or under `.darkfactory/`; defining the same logical file in both places is an error.
- Only the current `.df` contracts are read by the final system.
- Repository/package/ecosystem/domain evidence is detected by the TypeScript runtime.
- Versioned capabilities resolve applicable test, typecheck, lint, format, docs, setup and release actions.
- Domain and capability are separate axes.
- Repository identity, taxonomy and non-detectable policy are data, not hard-coded source.
- The canonical/default branch is discovered from repository state/configuration.
- Detection and action resolution fail closed on malformed/unreadable declared evidence, unknown explicit declarations, ambiguous ownership and missing required quality actions.
- Every first-party package/capability is covered exactly once by an owning action or an explicit justified workspace-level/not-applicable declaration.

## Consequences

Repository behavior is determined by current declarations plus detected evidence and capability resolution. The final runtime has one strict configuration/detection model, and a green quality result proves complete resolved coverage rather than silently skipping unsupported packages/actions.
