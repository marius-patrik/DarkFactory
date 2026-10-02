// Tables.
//
// The guide asks for the body typeface two points smaller than the running text,
// which is 10pt at 12pt body: "Tabulka se sází stejným typem písma jako základní
// text, velikost je o dva body menší, tj. 10 bodů" (kap. 6.1.1).

#import "fonts.typ": PISMO

#let apply(body) = {
  set table(
    stroke: 0.5pt,
    inset: (x: 5pt, y: 4pt),
  )
  // Typst takes no font or size argument on `table`, so the cell text is
  // restyled through a rule on the element.
  show table: it => text(font: PISMO, size: 10pt, it)
  body
}
