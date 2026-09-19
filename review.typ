#import "thesis.typ": thesis

// Kompatibilní přímý review vstup.
// Kanonická CI/release kompilace používá main.typ + --input review=true.
#let profile-mode = sys.inputs.at("profile", default: "school")
#thesis(review: true, profile: profile-mode)
