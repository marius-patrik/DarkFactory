#import "../components/metadata.typ": meta

// Annotation, abstract and keywords.
//
// Anotace and Abstract are separate pages. They were previously one
// unbreakable block sharing a page, which crowded both onto a single sheet:
// the Czech annotation ran into the English abstract with no separation, and the
// English set mid-sentence line breaks because it had no fresh measure.
#pagebreak(weak: true)

// Ragged right, not justified. Czech sentences here are long and the block fills
// most of a page, so justification leaves the line no slack: Typst will not break
// after a full stop in this language, and where the next word does not fit it
// crushes the sentence space instead, which printed "změn.Strukturu". Ragged
// right removes the condition. The body text stays justified.
#set par(justify: false)
#block(breakable: false)[
  #block(above: 21pt, below: 10pt, text(size: 16pt, weight: "bold")[Anotace])
  #meta.annotation-cs

  #v(0.6em)
  #strong[Klíčová slova:] coding agents; software factory; AI; Agentic Engineering; harness
]

#pagebreak(weak: true)
#block(breakable: false)[
  #block(above: 21pt, below: 10pt, text(size: 14pt, weight: "bold")[Abstract])
  #meta.abstract-en

  #v(0.6em)
  #strong[Keywords:] coding agents; software factory; AI; Agentic Engineering; harness
]