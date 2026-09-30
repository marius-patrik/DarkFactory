// Industry-term rendering.
// English comes first, Czech equivalent follows in parentheses when useful.
// Definitions are printed as footnotes so the main theory stays readable.

#let term-name(en, cs: none) = {
  let label = if cs == none { en } else { en + " (" + cs + ")" }
  [#text("*")#strong[#emph[#label]]]
}

#let term(en, cs: none, definition: none) = {
  term-name(en, cs: cs)
  if definition != none {
    footnote([#strong[#emph[#en]] — #definition])
  }
}
