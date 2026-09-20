#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "transformer",
    industry: "Transformer",
  czech: "Transformerová architektura",
  english: "Transformer Architecture",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
definition: terms => [
Transformer je architektura neuronových sítí založená na mechanismu pozornosti, která modeluje vztahy mezi prvky sekvence a tvoří základ většiny současných velkých jazykových modelů.
  ],
  description: terms => [
#unconfirmed[
Současné velké jazykové modely jsou typicky realizovány transformerovou architekturou. Pro generování textu se často používá dekodérové uspořádání, které nad dosavadní sekvencí vytváří reprezentace potřebné k odhadu následujícího tokenu.
]
  ],
  summary: terms => [
Pro tuto práci je podstatné, že transformer zpracovává tokenové reprezentace v omezeném kontextu a vytváří stav potřebný k postupnému odhadu dalších tokenů; detailní matematika trénování není předmětem práce.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)