#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "transformer",
  keyword: "Transformer",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
  definition: terms => [
Architektura neuronové sítě založená na mechanismu pozornosti, který modeluje vztahy mezi prvky sekvence. #cite(bib.vaswani2017)
  ],
  description: terms => [
Při autoregresivním generování dekodér z dosavadní sekvence vytváří reprezentaci použitou k odhadu následujícího tokenu. #cite(bib.vaswani2017)
  ],
  relations: (),
)
