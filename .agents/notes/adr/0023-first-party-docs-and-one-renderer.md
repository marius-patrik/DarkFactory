# ADR-0023 — First-party docs use docs.df and one renderer

**Status**: Accepted

**Related rules**: `DF-RULE-002`

## Decision

- `@darkfactory/docs` is the headless documentation compiler/content-graph owner.
- `docs.df` is the only DarkFactory documentation configuration contract.
- The compiler builds one typed content graph from canonical Markdown, ADRs/rules, TypeScript/TSDoc API extraction, capability-contributed documentation and repository/graph/workflow metadata.
- TypeDoc may be used internally as the TypeScript/TSDoc extractor.
- `@darkfactory/web` is the only first-party web renderer.
- `docs/home.md` remains the product homepage. Root `README.md` is a deterministic index/projection of current `.agents/notes/**`, analogous to `AGENTS.md` as the rules projection; it is not a duplicate product homepage.
- Consumer repositories use the released web bundle plus repository-specific compiled content/data.

## Consequences

Documentation has one compiler/configuration contract and one first-party renderer while product docs, rules and long-term notes retain distinct canonical sources and generated discovery projections.
