#import "thesis.typ": thesis
#import "templates/registry.typ": default-template

// Jediný kanonický vstup kompilace.
// template: název dokumentové šablony z templates/registry.typ
// review: false/true
// profile: school/cs/en/merged
#let review-mode = sys.inputs.at("review", default: "false") in ("true", "1", "yes")
#let template-mode = sys.inputs.at("template", default: default-template)
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

#thesis(
  review: review-mode,
  profile: profile-mode,
  template-name: template-mode,
)
