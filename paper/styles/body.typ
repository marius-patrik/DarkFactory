// Body text: the face, size, language and paragraph rhythm that every other element
// inherits unless it overrides them.
//
// `par` is set before `text` so that the relative `em` in the leading is resolved
// against the base size this module establishes, and not against whatever a caller
// happened to have in force.

#import "fonts.typ": PISMO

#let body-text(body) = {
  set par(justify: true, leading: 1.5 * 0.65em, spacing: 8pt, first-line-indent: 0pt)
  set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)
  body
}
