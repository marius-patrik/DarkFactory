// Figures and their captions.
//
// Captions sit under the figure, left-aligned and a step down from body text, so the
// figure itself stays the thing the eye lands on.

#let apply(body) = {
  set figure(numbering: "1")

  show figure.caption: set text(size: 10pt)
  show figure.caption: set align(left)

  body
}
