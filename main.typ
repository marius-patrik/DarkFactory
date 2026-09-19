#import "thesis.typ": thesis

// Jediný kanonický vstup kompilace.
// review: false/true
// profile: school/cs/en/merged
// Legacy language=cs/en/merged zůstává podporováno (cs mapuje na school).
#let review-mode = sys.inputs.at("review", default: "false") in ("true", "1", "yes")
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

#thesis(review: review-mode, profile: profile-mode)
