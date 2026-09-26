// Bulleted and numbered lists. The `show` rules exist so a list can break across
// pages without losing its items to the surrounding block spacing.

#let apply(body) = {
  set list(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
  set enum(indent: 0pt, body-indent: 0.75em, spacing: 4pt)

  show list: it => block(above: 3pt, below: 5pt, breakable: true, it)
  show enum: it => block(above: 3pt, below: 5pt, breakable: true, it)

  body
}
