// Code: block and inline.
//
// Raw text is the one place a second typeface appears, so it is tinted and framed to
// read as quoted material rather than as running prose.

#import "fonts.typ": MONO

#let apply(body) = {
  show raw: set text(font: MONO, size: 9.5pt)

  show raw.where(block: true): it => block(
    fill: rgb("#f4f4f2"),
    stroke: 0.35pt + rgb("#9a9a96"),
    inset: (x: 8pt, y: 6pt),
    width: 100%,
    text(fill: rgb("#222222"), it),
  )

  show raw.where(block: false): it => box(
    fill: rgb("#f4f4f2"),
    stroke: 0.25pt + rgb("#b0b0aa"),
    inset: (x: 2pt, y: 0.5pt),
    text(fill: rgb("#222222"), it),
  )

  body
}
