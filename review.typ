#import "thesis.typ": thesis
#import "templates/registry.typ": default-template

// Kompatibilní přímý review vstup.
// Kanonická CI/release kompilace používá main.typ + --input review=true.
#let profile-mode = sys.inputs.at("profile", default: "school")
#let template-mode = sys.inputs.at("template", default: default-template)
#thesis(review: true, profile: profile-mode, template-name: template-mode)
