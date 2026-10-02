// Page geometry.
//
// Front matter carries no footer. The running footer is a value the document turns
// on itself, part-way through, so that the title page, the declaration and the
// annotation stay unnumbered; see `footer.typ`. For the same reason this module
// sets no `footer` key at all: naming it here would claim the property for the whole
// document and the document could not then switch it on later.

#let page-setup(body) = {
  set page(
    paper: "a4",
    margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 2.5cm),
  )
  body
}
