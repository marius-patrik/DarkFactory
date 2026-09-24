# ADR-0023 — First-party docs use .agents/docs.df and one renderer

**Status**: Accepted

**Related rules**: `DF-RULE-002`, `DF-RULE-003`

## Decision

- `@darkfactory/docs` is the headless documentation compiler/content-graph owner.
- `.agents/docs.df` is the only DarkFactory documentation configuration contract.
- The compiler builds one typed content graph from canonical Markdown, ADRs/rules, TypeScript/TSDoc API extraction, capability-contributed documentation and repository/graph/workflow metadata.
- TypeDoc may be used internally as the TypeScript/TSDoc extractor.
- `@darkfactory/web` is the only first-party web renderer.
- `.agents/PRD.md` is the product homepage. `.agents/notes/rules/**` and `.agents/notes/adr/**` are canonical. Root `README.md` is a symlink to the canonical product document; `.agents/AGENTS.md` is the deterministic generated projection of canonical rules. Supported discovery aliases may point to canonical documents or generated projections, but internal legacy aliases are not retained.
- Consumer repositories use the released web bundle plus repository-specific compiled content/data.

## Consequences

Documentation has one compiler/configuration contract and one first-party renderer while product docs, rules and long-term notes retain distinct canonical sources and generated discovery projections.
