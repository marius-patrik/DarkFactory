#import "thesis.typ": thesis

// Jediný kanonický vstup kompilace.
// review: false/true
// language: cs/en/merged
#let review-mode = sys.inputs.at("review", default: "false") in ("true", "1", "yes")
#let language-mode = sys.inputs.at("language", default: "cs")
#thesis(review: review-mode, language: language-mode)
