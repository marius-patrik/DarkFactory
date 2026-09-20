#import "books.typ": default-book, default-template-for, render-pdf

#let book-mode = sys.inputs.at("book", default: default-book)
#let profile-mode = sys.inputs.at("profile", default: "school")
#let template-mode = sys.inputs.at("template", default: default-template-for(book-mode))

#render-pdf(
  book-mode,
  review: true,
  profile: profile-mode,
  template-name: template-mode,
)
