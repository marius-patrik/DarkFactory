#import "../components/metadata.typ": meta

#pagebreak(weak: true)

#block(breakable: false)[
  #block(above: 21pt, below: 10pt, text(size: 16pt, weight: "bold")[Anotace])
  #meta.annotation-cs

  #v(0.6em)
  #strong[Klíčová slova] — #meta.keywords-cs.join("; ")
]

#pagebreak(weak: true)
#block(breakable: false)[
  #block(above: 21pt, below: 10pt, text(size: 14pt, weight: "bold")[Abstract])
  #meta.abstract-en

  #v(0.6em)
  #strong[Keywords] — #meta.keywords-en.join("; ")
]
