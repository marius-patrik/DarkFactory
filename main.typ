#import "books.typ": default-book, default-template-for, render-pdf

#let book-mode = sys.inputs.at("book", default: default-book)
#let review-mode = sys.inputs.at("review", default: "false") in ("true", "1", "yes")
#let template-mode = sys.inputs.at("template", default: default-template-for(book-mode))

#render-pdf(
  book-mode,
  review: review-mode,
  template-name: template-mode,
)
