# ADR-0023 — First-party docs use docs.df and one shared renderer

**Status**: Accepted · 2026-09-20

**Supersedes**: ADR-0018.

## Context

ADR-0018 established the correct final direction: a first-party headless documentation compiler, one shared web renderer, generated TypeScript API documentation and README projection. It still retained ProperDocs/MkDocs configuration ingestion as a compatibility surface.

The final-version-only completion decision removes that compatibility requirement.

## Decision

- `@darkfactory/docs` is the only first-party documentation compiler/content-graph owner.
- `docs.df` is the only DarkFactory documentation configuration contract.
- ProperDocs and MkDocs are not final runtime dependencies and their configuration files are not compatibility inputs to the final system.
- The compiler builds one typed content graph from canonical Markdown, ADRs/rules, TypeScript/TSDoc API extraction, capability-contributed documentation, repository/graph/workflow metadata and supported API extractors for other ecosystems.
- TypeDoc may be used internally as the TypeScript/TSDoc extractor.
- `@darkfactory/web` is the only first-party web renderer. The docs package owns no independent theme/frontend runtime.
- The same canonical semantic homepage/content source renders the published homepage and committed `README.md`; deterministic drift is a CI failure.
- Consumer repositories use the released web bundle plus their compiled repository content/data and do not rebuild a separate docs frontend.

## Consequences

Legacy ProperDocs/MkDocs config and runtime integration are deletion-bound implementation artifacts. Recovered D4/F42/F44 behavior is reconciled into `@darkfactory/docs`, the final package/capability quality contract and the shared web renderer rather than preserved as compatibility code.
