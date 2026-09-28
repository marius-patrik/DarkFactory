// Body text: the face, size, language and paragraph rhythm that every other element
// inherits unless it overrides them.
//
// `par` is set before `text` so that the relative `em` in the leading is resolved
// against the base size this module establishes, and not against whatever a caller
// happened to have in force.

#import "fonts.typ": PISMO

#let body-text(body) = {
  // The guide requires 8pt below a paragraph (kap. 4). Typst's `spacing` is a target for the
  // whole inter-paragraph distance, not an increment on the leading, so the number written here
  // is not the gap that appears on the page. Measured in the built PDF with
  // `bun scripts/measure-leading.ts ../PAPER.pdf`, the extra space introduced is
  // `spacing - 11.7pt`: 24pt measured 12.3pt, 12pt measured 0.3pt. 19.7pt therefore targets the
  // required 8pt gap. Re-measure after any change to the leading, the size, or this value -
  // `spacing: 12pt` here looks like compliance and is no gap at all.
  set par(justify: true, leading: 1.5 * 0.65em, spacing: 19.7pt, first-line-indent: 0pt)
  set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)
  body
}
