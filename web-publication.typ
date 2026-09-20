#import "books.typ": default-book, render-web

#let book-mode = sys.inputs.at("book", default: default-book)
#let review-mode = sys.inputs.at("review", default: "false") in ("true", "1", "yes")

#render-web(
  book-mode,
  review: review-mode,
)
