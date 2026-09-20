#import "books.typ": default-book, render-web

#let book-mode = sys.inputs.at("book", default: default-book)
#let review-mode = sys.inputs.at("review", default: "false") in ("true", "1", "yes")
#let profile-mode = sys.inputs.at("profile", default: "school")

#render-web(
  book-mode,
  review: review-mode,
  profile: profile-mode,
)
