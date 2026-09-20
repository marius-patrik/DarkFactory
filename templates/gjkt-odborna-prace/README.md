# gjkt-odborna-prace

Typst document template for the GJKT odborná práce format.

This directory is **not** a standalone Typst package. It is one template
implementation inside DarkFactory-Paper and exports a `template(...)[body]`
function from `template.typ`.

The project selects templates through `templates/registry.typ`. Shared manuscript semantics (review markers, publication-profile state, bilingual helpers and terminology) live in `templates/common.typ`. This implementation owns only GJKT document structure/layout plus its word-count integration. A future template can therefore provide another document layout while reusing the same manuscript semantics and build pipeline.

Files:
- `template.typ` — GJKT document structure and layout implementation.
- `wordometer.typ` — text extraction/counting helper used by the template.


## Chapter presentation

Numbered level-1 headings in the main body are rendered directly in the normal
document flow. Only the overall thesis title page receives dedicated title-page
treatment; main chapters do not receive separate title pages or synthetic page breaks.

The GJKT template owns:
- heading hierarchy and spacing,
- page margins, footer/page numbers and front matter,
- paragraph/list/table/figure typography,
- appendix heading behavior and the retained `Seznam příloh | List of appendices`.

The standalone terminology `Rejstřík | Index` is not part of the document. Canonical
terms are expected to be used directly by manuscript content, while the compact
usage-driven keyword list remains in front matter.


## Semantic web publication

The paged GJKT template remains authoritative for the PDF/print layout. The repository
also provides `web-publication.typ`, a template-neutral semantic entrypoint for
Typst's HTML target. It imports the same manuscript chapters and shared review/profile/
terminology semantics without attempting to reproduce page margins, title-page layout,
or other print-only GJKT presentation in HTML.

`scripts/build_web_exports.py` compiles that semantic entrypoint to HTML and derives
Markdown from the compiled HTML. These web formats therefore represent the same
manuscript state but are intentionally semantic rather than paginated replicas.
