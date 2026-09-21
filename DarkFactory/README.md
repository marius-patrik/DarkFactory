# DarkFactory book root

`DarkFactory/` is one complete book inside the multi-book `DarkFactory-Paper` project.

The directory name, structural root key, and main book title are one identity. `index.typ` declares the top-level folder `DarkFactory`; its exported `book-title` is consumed by the PDF and web renderers. Repository-global metadata does not duplicate the book's main title.

## Structural contract

- Folder manifests (`index.typ`) are the sole source of section hierarchy.
- A folder may designate one section concept, contain direct concepts, and contain child folders.
- Nested folders create nested sections to arbitrary depth.
- Section headings are derived from the section concept's canonical full term surface.
- Section concepts and direct concepts render as numbered sections. Example concepts render inline inside their parent without a separate numbered heading.
- The canonical prose fields are exactly `definition` and `description`; theory/practical/document projection fields and a separate concept summary field do not exist.
- The renderer never inserts generic `Úvod` subsections.
- Semantic `dependency` and `related` relations never create containment.
- Concept files own terminology and manuscript content. Example and attachment concepts also own their citations and any authoritative image source.
- `manuscript/` owns document-level structure, including Introduction, the top-level Theory and Practical wrappers, Results, Conclusion, and Appendices.
- `development-environment/`, `language-models/`, and `agentic-engineering/` own reusable domain concepts.
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
