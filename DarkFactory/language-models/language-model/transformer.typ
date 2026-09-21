#import "/DarkFactory/templates/common.typ": unconfirmed, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "transformer",
  industry: "Transformer",
  czech: "Transformer",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
  definition: terms => [
Architektura neuronových sítí založená na mechanismu pozornosti, která modeluje vztahy mezi prvky sekvence a tvoří základ většiny současných velkých jazykových modelů.
  ],
  description: terms => [#unconfirmed[
Při generování textu se často používá dekodérové uspořádání, které z dosavadní sekvence vytváří reprezentace pro odhad následujícího tokenu.
  ]],
  relations: (),
)
