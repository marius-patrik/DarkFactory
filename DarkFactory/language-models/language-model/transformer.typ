#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "transformer",
    proper: translation(cs: "Transformerová architektura", en: "Transformer Architecture"),
    industry: translation(cs: "Transformer", en: "Transformer"),
    explanation_cs: "Architektura neuronových sítí založená na mechanismu pozornosti, která modeluje vztahy mezi prvky sekvence a tvoří základ většiny současných velkých jazykových modelů.",
    explanation_en: "A neural-network architecture based on attention mechanisms that models relationships among sequence elements and underlies most contemporary large language models.",
    citation: bib.vaswani2017,
    source: bib.vaswani2017,
)

#let item = concept(
  key: "transformer",
  term: terminology,
  definition: none,
  description: terms => [
#unconfirmed[
Současné velké jazykové modely jsou typicky realizovány transformerovou architekturou. Pro generování textu se často používá dekodérové uspořádání, které nad dosavadní sekvencí vytváří reprezentace potřebné k odhadu následujícího tokenu.
]
  ],
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)