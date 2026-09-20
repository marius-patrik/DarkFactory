# ADR-0021 — Repository declarations and capability-driven detection

**Status**: Accepted

## Decision

- `repo.df` is the repository/product declaration.
- `config.df` is runtime/user/provider configuration.
- `docs.df` is documentation configuration.
- `repo.df` and `config.df` may live at repository root or under `.darkfactory/`; defining the same logical file in both places is an error.
- Only the current `.df` contracts are read by the final system.
- Repository/package/ecosystem/domain evidence is detected by the TypeScript runtime.
- Versioned capabilities resolve applicable test, lint, format, docs, setup and release actions.
- Domain and capability are separate axes.
- Repository identity, taxonomy and non-detectable policy are data, not hard-coded source.
- The canonical/default branch is discovered from repository state/configuration.

## Consequences

Repository behavior is determined by current declarations plus detected evidence and capability resolution. The final runtime has one configuration/detection model.
