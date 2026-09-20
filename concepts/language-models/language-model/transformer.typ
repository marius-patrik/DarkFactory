#import "../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../schema.typ": concept

#let terminology = define-term(
    id: "transformer",
    proper: translation(cs: "Transformerová architektura", en: "Transformer Architecture"),
    industry: translation(cs: "Transformer", en: "Transformer"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Architektura neuronových sítí založená na mechanismu pozornosti, která modeluje vztahy mezi prvky sekvence a tvoří základ většiny současných velkých jazykových modelů.",
    explanation_en: "A neural-network architecture based on attention mechanisms that models relationships among sequence elements and underlies most contemporary large language models.",
  )

#let item = concept(
  key: "transformer",
  term: terminology,
  heading: terms => [#term(terms.transformer, marker: false, linked: false, emphasized: false)],
  theory_enabled: false,
  theory_intro: none,
  theory_body: none,
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "embedding"),)
)
