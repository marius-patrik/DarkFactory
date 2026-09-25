# ADR-0028 — Integrate Paper as a repository domain

**Status**: Accepted

**Related rules**: `DF-RULE-020`

## Decision

- DarkFactory has one first-party Paper domain for the thesis manuscript and its publication.
- The Paper has one authored manuscript source and one publication owner.
- Paper publication produces the repository release artifact `PAPER.pdf`; it does not own repository documentation Markdown.
- The Paper uses the shared documentation, capability, CI, and release contracts.

## Consequences

The thesis remains a first-class repository concern without creating a second documentation owner or a second product surface.
