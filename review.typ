#import "thesis.typ": thesis

// Kompatibilní vstup pro přímé typst compile review.typ.
// Kanonická CI/release kompilace používá main.typ + --input review=true.
#let language-mode = sys.inputs.at("language", default: "cs")
#thesis(review: true, language: language-mode)
