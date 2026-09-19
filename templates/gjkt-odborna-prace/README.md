# gjkt-odborna-prace

Typst document template for the GJKT odborná práce format.

This directory is **not** a standalone Typst package. It is one template
implementation inside DarkFactory-Paper and exports a `template(...)[body]`
function from `template.typ`.

The project selects templates through `templates/registry.typ`. Manuscript files
import only the registry, never this implementation directly. A future template can
therefore provide another document layout while reusing the same manuscript,
publication profiles and build pipeline.

Files:
- `template.typ` — GJKT document structure, layout and review renderer.
- `wordometer.typ` — text extraction/counting helper used by the template.
