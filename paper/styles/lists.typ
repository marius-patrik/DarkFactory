// Bulleted and numbered lists. The `show` rules exist so a list can break across
// pages without losing its items to the surrounding block spacing.
//
// The item gap and the gap around the list are set here, not in ../body.typ, because
// this module is applied after it and would otherwise be overridden. Both are measured
// in the built PDF rather than assumed:
//
//   item to item          spacing 22pt -> 30.0pt   (a paragraph gap measures 32.0pt)
//   line to line, wrapped 19.7pt, set by `par.leading` in ../body.typ
//   list to paragraph      above/below 16pt -> 24.0pt
//
// At the previous 4pt the items sat 12.0pt apart, tighter than the 19.7pt between two
// lines of one wrapped item, so a wrapped bullet read as a solid block. Do not retighten
// these without re-measuring.

#let apply(body) = {
  set list(indent: 0pt, body-indent: 0.75em, spacing: 22pt)
  set enum(indent: 0pt, body-indent: 0.75em, spacing: 22pt)

  show list: it => block(above: 16pt, below: 16pt, breakable: true, it)
  show enum: it => block(above: 16pt, below: 16pt, breakable: true, it)

  body
}
