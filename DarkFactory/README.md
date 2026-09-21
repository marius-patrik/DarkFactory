# DarkFactory book root

`DarkFactory/` is one complete book inside the multi-book `DarkFactory-Paper` project.

The directory name, structural root key, and main book title are one identity. `index.typ` declares the top-level folder `DarkFactory`; its exported `book-title` is consumed by the PDF and web renderers. Repository-global metadata does not duplicate the book's main title.

## Structural contract

- Folder manifests (`index.typ`) are the sole source of section hierarchy.
- A folder may designate one section concept, contain direct concepts, and contain child folders.
- Nested folders create nested sections to arbitrary depth.
- Section headings use the section concept's canonical full term surface unless the structural folder provides an explicit display-only `title`.
- Section concepts and direct concepts render as headings. Levels 1–3 are numbered; level 4 and deeper remain outlined/indexed but render without section numbers. The contents uses explicit per-level indentation so unnumbered deep headings remain visibly nested. Visual inline examples render only their description and figure; non-visual examples retain their inline term/definition rendering.
- The canonical prose fields are exactly `definition` and `description`; theory/practical/document projection fields and a separate concept summary field do not exist.
- `keyword` defaults to `false`; only deliberately curated thesis-defining concepts set `keyword: true` and appear in the Keywords list.
- The renderer never inserts generic `Úvod` subsections.
- Semantic `dependency` and `related` relations never create containment.
- Concept files own terminology and manuscript content. Example and attachment concepts also own their citations and any authoritative image source.
- `manuscript/` owns document-level structure, including Introduction, the top-level Theory and Practical wrappers, Results, Conclusion, and Appendices.
- `language-models/` owns LLM concepts; `agentic-engineering/agent-harness/` is one flat Agent Harness section; `agentic-engineering/` owns the engineering/control sections including Harness Engineering, Context Engineering, and Skills; `development-environment/` is one flat Practical section.
- `manuscript/appendices/` is the canonical appendix root.

## Book-local publication assets

This book owns all resources required to publish itself:

- `templates/` — shared semantics, template registry, and document layouts,
- `fonts/` — reproducible fonts,
- `bib/` — bibliography data and citation handles,
- `img/` — book figures and school/logo assets,
- `metadata.typ` — author/school/front-matter metadata and title suffix,
- `thesis.typ` — paged PDF composition,
- `web-publication.typ` — semantic HTML composition,
- `book.typ` — root interface exported to `../books.typ`.

A second book must be a sibling top-level directory with the same `book.typ` contract. It must not share a repository-global concepts/templates/assets tree.

## Terminology contract

Canonical terms use:
- `industry` — established field-facing term or abbreviation,
- `proper` — formal localized name,
- optional `alias` — alternate name.

The full surface leads with the industry term, then adds the Czech proper name in parentheses, the English proper name in brackets when distinct, and an optional alias when distinct. Duplicate layers are removed, and section titles use this same canonical surface.
