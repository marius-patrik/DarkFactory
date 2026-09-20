#import "/DarkFactory/metadata.typ": meta, title-value, title-display
#import "/DarkFactory/templates/common.typ": review-state, finalized, ui-label, translation, translation-heading, render-keywords
#import "/DarkFactory/index.typ": book-title, concepts, render-manuscript, render-appendices

#let publication(
  review: false,
) = {
  review-state.update(review)

  let publication-title = title-value(book-title)
  let publication-title-display = title-display(book-title)

  set document(title: publication-title, author: meta.autor)
  set text(lang: "cs")
  set heading(numbering: "1.1")
  show cite: it => super(it)

  heading(level: 1, numbering: none)[#publication-title-display]
  par[#meta.autor · #meta.skola · #meta.rok]

  heading(level: 1, numbering: none)[#finalized[Anotace]]
  meta.at("annotation-cs")

  heading(level: 1, numbering: none)[#finalized[Abstract]]
  meta.at("abstract-en")

  heading(level: 1, numbering: none)[#finalized[#translation-heading(
    translation(cs: [Klíčová slova], en: [Keywords]),
    separator: "paren",
    order: "en-cs",
  )]]
  render-keywords(concepts)

  outline(title: ui-label([Obsah], [Contents]), depth: 6)

  render-manuscript()

  bibliography(
    "/DarkFactory/bib/references.bib",
    style: "iso-690-numeric",
    title: ui-label([Seznam zdrojů], [References]),
    full: true,
  )

  heading(level: 1, numbering: none)[#finalized[#ui-label([Seznam obrázků a tabulek], [List of figures and tables])]]
  outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))

  heading(level: 1, numbering: none)[#finalized[#ui-label([Seznam příloh], [List of appendices])]]
  counter(heading).update(0)
  set heading(numbering: "A.1", supplement: [Příloha])
  outline(title: none, target: heading.where(level: 1, supplement: [Příloha]))
  render-appendices()
}
