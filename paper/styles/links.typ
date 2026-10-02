// Links.
//
// The thesis is read on paper, so a link is printed in the body colour instead of
// being tinted like a hyperlink. Only citations actually produce links.

#let apply(body) = {
  show link: set text(fill: rgb("#222222"))
  body
}
