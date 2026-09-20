# Concept-driven manuscript

The thesis is composed from canonical concept files.

- Every level-2 section is a folder with an `index.typ`.
- Every canonical term or renderable subsection is one `.typ` concept file.
- A concept owns its terminology and explicit theoretical/practical intro, body, summary, and post-content slots.
- Section indexes define section metadata and deterministic concept ordering.
- `concepts/index.typ` builds the vocabulary and renders chapters from these records.
- `templates/terms.typ` is a compatibility projection; terminology is edited in concept files only.

Typst imports are explicit because Typst does not enumerate source directories at runtime. Composition after import is data-driven and duplicate keys are rejected.
