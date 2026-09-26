// Entry point of the document.
//
// This file and ./pages/index.typ together are the whole of the non-content: `main.typ`
// sets the document up and applies the styling, `pages/index.typ` says in what order
// the pages appear. Neither contains thesis text.
//
//   main.typ                  this file — document setup, style application
//   pages/index.typ           the order of the pages
//   pages/*.typ               the text, one file per printed page or level-2 section
//   styles/                   the rules
//   components/metadata.typ   document data: author, title, annotation, abstract
//   components/bib/           the bibliography and its CSL style
//   components/fonts/         the typefaces
//   components/img/           the figures
//
// Why the entry point is not called `index.typ`: `index.typ` is the conventional name
// for the thing that *describes a directory*, and it is used for that in ./pages. This
// file is the package entry, so it is `main.typ`.
//
// Asset paths are written project-root relative (`/components/img/...`) so that a page
// can be moved or renamed without rewriting the references inside it. Fonts are
// discovered by Typst from the project root, so ./components/fonts needs no
// declaration here; the publication build is told about it explicitly instead.

#import "styles/main.typ": apply
#import "components/metadata.typ": meta

#set document(title: meta.title, author: meta.author, date: none)

// Applies every `#set`/`#show` rule in ./styles to everything below.
#show: apply

// The front matter is unnumbered; ./pages/index.typ switches the footer on once the
// outline is past.
#set page(footer: none)

#include "pages/index.typ"
