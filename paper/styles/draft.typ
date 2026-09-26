// Draft passages.
//
// Some of the writing is provisional: an argument that is still being weighed, or a
// stage of the practical part that may not survive to the submitted version. Rather
// than leave such passages indistinguishable from settled text — or park them in a
// separate file where they stop being readable in context — they are wrapped in
// `draft[]` and printed in a marked block.
//
// The point is that a reader can tell at a glance which claims are load-bearing.
// Everything inside a `draft[]` block is unconfirmed: it may be reworded, cut, or
// contradicted by later work without the rest of the thesis being invalidated.
//
// To find them: `grep -n 'draft\[' index.typ`
// To drop one: delete the whole block. Nothing outside it depends on a draft passage,
// so removal needs no other edit. Keep draft passages free of headings and figures,
// so that deleting one cannot leave a dangling outline entry or figure number.

#let draft-tag-color = rgb("#b45309")
#let draft-rule-color = rgb("#d97706")
#let draft-edge-color = rgb("#fcd34d")
#let draft-fill = rgb("#fffbeb")

#let draft(body, tag: "NÁVRH · NEPOTVRZENO") = block(
  width: 100%,
  breakable: true,
  fill: draft-fill,
  stroke: (
    left: 2.5pt + draft-rule-color,
    top: 0.5pt + draft-edge-color,
    bottom: 0.5pt + draft-edge-color,
    right: 0.5pt + draft-edge-color,
  ),
  radius: (right: 4pt),
  inset: (x: 10pt, y: 8pt),
  text(fill: rgb("#3f2d16"))[
    #block(
      above: 0pt,
      below: 4pt,
      text(size: 8.5pt, weight: "bold", tracking: 0.8pt, fill: draft-tag-color)[#tag],
    )
    #body
  ],
)

// A provisional aside inside an otherwise final sentence. Weaker than `draft[]`:
// it marks the claim, not a whole passage.
#let draft-inline(body) = box[
  #text(fill: draft-rule-color)[#body]
]
