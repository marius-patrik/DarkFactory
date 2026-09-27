// Body text: the face, size, language and paragraph rhythm that every other element
// inherits unless it overrides them.
//
// `par` is set before `text` so that the relative `em` in the leading is resolved
// against the base size this module establishes, and not against whatever a caller
// happened to have in force.

#import "fonts.typ": PISMO

#let body-text(body) = {
  // Paragraph spacing sits clearly above the leading, so a break between paragraphs is
  // visible rather than inferred. A level-2 heading carries 19pt above itself; a 12pt
  // gap keeps the same rhythm a step quieter, which is what separates body paragraphs
  // from sections.
  //
  // `spacing` is a target for the whole inter-paragraph distance, not an increment on
  // top of the leading, and it is measured against a leading of 19.6pt here. Measured
  // in the built PDF, `spacing: 12pt` therefore lands at 0.3pt over the leading, which
  // is no gap at all; 24pt lands at 12.3pt, which is the 12pt the text asks for. Do not
  // "simplify" this back to 12pt without re-measuring.
  set par(justify: true, leading: 1.5 * 0.65em, spacing: 24pt, first-line-indent: 0pt)
  set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)
  body
}
