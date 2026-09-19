# gjkt-odborna-prace

Typst document template for the GJKT odborná práce format.

This directory is **not** a standalone Typst package. It is one template
implementation inside DarkFactory-Paper and exports a `template(...)[body]`
function from `template.typ`.

The project selects templates through `templates/registry.typ`. Shared manuscript semantics (review markers, publication-profile state, bilingual helpers and terminology) live in `templates/common.typ`. This implementation owns only GJKT document structure/layout plus its word-count integration. A future template can therefore provide another document layout while reusing the same manuscript semantics and build pipeline.

Files:
- `template.typ` — GJKT document structure and layout implementation.
- `wordometer.typ` — text extraction/counting helper used by the template.
