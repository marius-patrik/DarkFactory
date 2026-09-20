# ADR-0023 — First-party docs use docs.df and one renderer

**Status**: Accepted

## Decision

- `@darkfactory/docs` is the headless documentation compiler/content-graph owner.
- `docs.df` is the only DarkFactory documentation configuration contract.
- The compiler builds one typed content graph from canonical Markdown, ADRs/rules, TypeScript/TSDoc API extraction, capability-contributed documentation and repository/graph/workflow metadata.
- TypeDoc may be used internally as the TypeScript/TSDoc extractor.
- `@darkfactory/web` is the only first-party web renderer.
- The same canonical homepage source renders the docs homepage and committed `README.md`.
- Consumer repositories use the released web bundle plus repository-specific compiled content/data.

## Consequences

Documentation has one compiler, one configuration contract, one semantic content source and one first-party renderer.
