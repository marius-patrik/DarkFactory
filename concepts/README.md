# Concept-driven manuscript

The manuscript structure is derived from the concept folder tree.

- A folder is the only source of section hierarchy.
- A folder may designate one canonical concept as its section concept. Its heading becomes the folder section heading.
- Concepts stored in the same folder render as continuous content without automatic subsection headings.
- Nested folders create nested sections to arbitrary depth.
- Semantic relations never create sections. They are limited to dependency and related relationships.
- Dependency relationships may order concepts within the same folder and are validated globally for cycles.
- Each index.typ is a structural folder manifest: section concept, direct concepts, and child folders.
- Concept files own terminology and theoretical/practical content.
- Typst imports remain explicit because source directories cannot be enumerated dynamically at runtime.
