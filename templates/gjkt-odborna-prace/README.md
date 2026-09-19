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

Numbered level-1 headings in the main body are rendered as dedicated chapter title
pages by `template.typ`. The manuscript only declares semantic headings with Typst
heading syntax; it must not insert chapter page breaks, vertical spacing, or heading
layout itself.

The GJKT template owns:
- chapter title pages and chapter page breaks,
- heading hierarchy and spacing,
- page margins, footer/page numbers and front matter,
- paragraph/list/table/figure typography,
- appendix heading behavior.

Appendices intentionally use the compact appendix heading mode rather than the main
chapter title-page treatment.

The terminology encyclopedia is emitted by the appendix wrapper immediately before
the list of appendices. It is alphabetically grouped as level-2 letter headings with
level-3 term headings, all outlined so both levels appear in the document contents.
The core word-count boundary is placed before this back-matter encyclopedia.
