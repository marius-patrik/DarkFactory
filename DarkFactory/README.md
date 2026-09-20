# DarkFactory book root

`DarkFactory/` is one complete book inside the multi-book `DarkFactory-Paper` project.

The directory name, structural root key, and main book title are one identity. `index.typ` declares the top-level folder `DarkFactory`; its exported `book-title` is consumed by the PDF and web renderers. Repository-global metadata does not duplicate the book's main title.

## Structural contract

- Folder manifests (`index.typ`) are the sole source of section hierarchy.
- A folder may designate one section concept, contain direct concepts, and contain child folders.
- Nested folders create nested sections to arbitrary depth.
- The section heading is derived from the section concept's canonical `proper` term.
- In `school` and `cs`, section headings render in Czech only; `en` renders English; `merged` may render both.
- Every concept, including direct concepts, examples, and attachments, renders as its own numbered section.
- The canonical content fields are `definition`, `description`, and `summary`; theory/practical/document projections do not exist.
- The renderer never inserts generic `Úvod` subsections.
- Semantic `dependency` and `related` relations never create containment.
- Concept files own terminology and manuscript content. Example and attachment concepts also own their citations and any authoritative image source.
- `manuscript/` owns document-level material such as introduction, objectives, methodology, results, conclusion, and appendices.
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

The full surface is `Industry (Proper) [Alias]` with duplicate layers removed. A section title explicitly uses the localized `proper` surface rather than the full technical surface.
