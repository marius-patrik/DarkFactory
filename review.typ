#import "books.typ": default-book, default-template-for, render-pdf

#let book-mode = sys.inputs.at("book", default: default-book)
#let template-mode = sys.inputs.at("template", default: default-template-for(book-mode))

#render-pdf(
  book-mode,
  review: true,
  template-name: template-mode,
)
