# ADR-0018 — First-party documentation engine and one shared web renderer

**Status**: Superseded by ADR-0023 · 2026-09-20

## Context

The current docs pipeline stages Markdown and invokes ProperDocs. The published site does not yet provide a real generated TypeScript API reference. A separate dashboard frontend would duplicate rendering, navigation and deployment infrastructure.

Consumer repositories should not rebuild a React application merely to publish their DarkFactory site.

## Decision

`@darkfactory/docs` becomes the headless documentation compiler. It accepts native `docs.df` and compatibility ingestion of existing `properdocs.yml` and `mkdocs.yml`. Documentation configuration does not move into `repo.df` or `config.df`.

The docs compiler produces one typed content graph from:

- canonical Markdown/root documents;
- ADRs and rules;
- TypeScript/TSDoc API extraction, with TypeDoc acceptable internally;
- capability-contributed documentation;
- repository/graph/workflow metadata;
- other supported package API extractors.

`@darkfactory/docs` does not own HTML themes or the user interface. `@darkfactory/web` is the only first-party web renderer for documentation and all other web page types.

The canonical homepage/content source is rendered both as the docs home page and as committed `README.md` Markdown. CI detects deterministic README projection drift.

The React web application is built once per DarkFactory release. Consumer repositories deploy the prebuilt web artifact plus repository-specific compiled content/data; they do not rebuild React/shadcn or maintain a local frontend.

## Rejected alternatives

### Keep ProperDocs as the final engine

Rejected because DarkFactory needs a first-party content model shared with the wider web UI and capability system.

### Build docs and dashboard as separate frontends

Rejected because they would duplicate routing, design system, deployment, authentication and state contracts.

### Generate README independently

Rejected because it would create another narrative source that can drift from the docs homepage.

## Consequences

- ProperDocs/MkDocs remain compatibility input formats, not runtime dependencies.
- Recovered D4/F42/F44 work is reconciled into the new docs/capability owners.
- #335/#336/#390 consume this architecture.
- GitHub Pages deployment uses the shared prebuilt web bundle.
