#import "../components/metadata.typ": meta

// Title page.
// ── title page ──────────────────────────────────────────
#align(center)[
  #set par(justify: false)
  #v(1cm)
  #text(size: 14pt, weight: "bold", meta.school)
  #v(0.5cm)
  #image("/components/img/logo.jpeg", width: 3cm)
  #v(1fr)
  #text(size: 24pt, weight: "bold", hyphenate: false)[#meta.title]
  #v(0.4cm)
  #text(size: 16pt)[#meta.subtitle]
  #v(0.7cm)
  #text(size: 15pt, tracking: 2pt)[ODBORNÁ PRÁCE]
  #v(1fr)
]
#align(left)[
  #grid(columns: (1fr, auto), column-gutter: 1.2em,
    [Autor práce: #meta.author, #meta.class],
    [Vedoucí práce: #meta.supervisor],
  )
  #v(0.8cm)
  #align(center)[#text(size: 12pt, str(meta.year))]
]
