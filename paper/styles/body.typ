// Body text: the face, size, language and paragraph rhythm that every other element
// inherits unless it overrides them.
//
// `par` is set before `text` so that the relative `em` in the leading is resolved
// against the base size this module establishes, and not against whatever a caller
// happened to have in force.

#import "fonts.typ": PISMO

#let body-text(body) = {
  // Paragraph spacing sits clearly above the leading, so a break between paragraphs is
  // visible rather than inferred. A level-2 heading carries 19pt above itself; 12pt
  // keeps the same rhythm a step quieter, which is what separates body paragraphs from
  // sections.
  set par(justify: true, leading: 1.5 * 0.65em, spacing: 12pt, first-line-indent: 0pt)
  set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)
  body
}
