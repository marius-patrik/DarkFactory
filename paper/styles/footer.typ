// The running page footer.
//
// A value rather than a rule, so the document decides where numbering begins:
// `#set page(footer: page-footer)` after the front matter, not here.

#import "fonts.typ": PISMO

#let page-footer = context align(
  center,
  text(font: PISMO, size: 11pt, counter(page).display("1")),
)
