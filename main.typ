#import "books.typ": default-book, default-template-for, render-pdf

#let book-mode = sys.inputs.at("book", default: default-book)
#let review-mode = sys.inputs.at("review", default: "false") in ("true", "1", "yes")
#let template-mode = sys.inputs.at("template", default: default-template-for(book-mode))
#let requested-profile = sys.inputs.at("profile", default: none)
#let legacy-language = sys.inputs.at("language", default: none)

#let profile-mode = if requested-profile != none {
  requested-profile
} else if legacy-language == "cs" {
  "school"
} else if legacy-language in ("en", "merged") {
  legacy-language
} else {
  "school"
}

#render-pdf(
  book-mode,
  review: review-mode,
  profile: profile-mode,
  template-name: template-mode,
)
