#import "../components/metadata.typ": meta

// Annotation, abstract and keywords.
#pagebreak(weak: true)
#block(breakable: false)[
  // Ragged right, not justified. Czech sentences here are long and the block fills
  // most of a page, so justification leaves the line no slack: Typst will not break
  // after a full stop in this language, and where the next word does not fit it
  // crushes the sentence space instead, which printed "změn.Strukturu". Ragged
  // right removes the condition. The body text stays justified.
  #set par(justify: false)
  #block(above: 21pt, below: 10pt, text(size: 16pt, weight: "bold")[Anotace])
  #meta.annotation-cs

  #v(0.6em)
  #strong[Klíčová slova:] coding agents; software factory; AI; Agentic Engineering; harness

  #v(1.8em)
  #block(above: 0pt, below: 8pt, text(size: 14pt, weight: "bold")[Abstract])
  #meta.abstract-en

  #v(0.6em)
  #strong[Keywords:] coding agents; software factory; AI; Agentic Engineering; harness
]
