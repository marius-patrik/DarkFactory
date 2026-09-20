#import "metadata.typ": meta
#import "templates/common.typ": review-state, profile-state, finalized, ui-label, render-translation, render-keywords, render-index
#import "templates/terms.typ": vocabulary

// Semantic publication entrypoint for Typst's HTML target.
// It consumes the same manuscript/review/profile state as the PDF build while
// intentionally avoiding page-only GJKT layout so the compiled HTML is native.
#let review-mode = sys.inputs.at("review", default: "false") in ("true", "1", "yes")
#let profile-mode = sys.inputs.at("profile", default: "school")
#assert(profile-mode in ("school", "cs", "en", "merged"), message: "profile must be school, cs, en, or merged")

#review-state.update(review-mode)
#profile-state.update(profile-mode)

#let publication-title = if profile-mode == "en" {
  meta.at("nazev-en", default: meta.nazev)
} else if profile-mode == "cs" {
  meta.at("nazev-cs", default: meta.nazev)
} else {
  meta.nazev
}

#let publication-title-display = if profile-mode in ("school", "cs", "merged") {
  [
    DarkFactory:#linebreak()
    Umělá inteligence v praxi -#linebreak()
    Agentické a harnessové inženýrství
  ]
} else {
  publication-title
}

#set document(title: publication-title, author: meta.autor)
#set text(lang: "cs")
#set heading(numbering: "1.1")

#heading(level: 1, numbering: none)[#publication-title-display]
#par[
  #meta.autor · #meta.skola · #meta.rok
]

#heading(level: 1, numbering: none)[#finalized[#ui-label([Anotace], [Annotation])]]
#render-translation(
  meta.annotation,
  language: "auto",
  school-both: true,
  labels: true,
  stacked: true,
  spacing: 8pt,
  order: "cs-en",
)

#heading(level: 1, numbering: none)[#finalized[#ui-label([Klíčová slova], [Keywords])]]
#render-keywords()

#outline(title: ui-label([Obsah], [Contents]), depth: 6)

#include "kapitoly/01-uvod.typ"
#include "kapitoly/02-teoreticka-cast.typ"
#include "kapitoly/03-prakticka-cast.typ"
#include "kapitoly/04-vysledky.typ"
#include "kapitoly/05-zaver.typ"

#bibliography(
  "/bib/references.bib",
  style: "iso-690-numeric",
  title: ui-label([Seznam zdrojů], [References]),
  full: true,
)

#heading(level: 1, numbering: none)[#finalized[#ui-label([Rejstřík], [Index])]]
#render-index(vocabulary.values())

#heading(level: 1, numbering: none)[#finalized[#ui-label([Seznam příloh], [List of appendices])]]
#counter(heading).update(0)
#set heading(numbering: "A.1", supplement: [Příloha])
#outline(title: none, target: heading.where(level: 1, supplement: [Příloha]))
#include "kapitoly/06-prilohy.typ"
