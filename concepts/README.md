# Concept-driven manuscript

The manuscript structure is derived from the concept folder tree.

- A folder is the only source of section hierarchy.
- A folder may designate one canonical concept as its section concept. The folder section heading is rendered from that concept's canonical term name; manual concept heading renderers do not determine section titles.
- Each rendered folder section emits the section concept's canonical rich `definition` when present, otherwise its term definition, followed by an `Úvod` subsection sourced from the active document/theory/practical intro variable.
- Concepts stored in the same folder render as continuous content without automatic subsection headings.
- Nested folders create nested sections to arbitrary depth.
- Semantic relations never create sections. They are limited to dependency and related relationships.
- Dependency relationships may order concepts within the same folder and are validated globally for cycles.
- Each index.typ is a structural folder manifest: section concept, direct concepts, and child folders.
- Concept files own terminology and all manuscript content. `concepts/manuscript/` owns the introduction, goals, research questions, methodology, results/discussion and conclusion; domain concepts own theory/practical projections.
- Typst imports remain explicit because source directories cannot be enumerated dynamically at runtime.

- `kapitoly/01-05*.typ` are compatibility projections only; substantive prose outside the concept catalog is prohibited.
