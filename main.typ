#import "thesis.typ": thesis

// Jediný kanonický vstup kompilace. Review varianta se zapíná pouze vstupem
// --input review=true; obě PDF tedy používají totožný obsah i renderer.
#let review-mode = sys.inputs.at("review", default: "false") in ("true", "1", "yes")
#thesis(review: review-mode)
