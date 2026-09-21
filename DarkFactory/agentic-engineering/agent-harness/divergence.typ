#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "divergence",
  czech: "Patologie divergence",
  english: "Agent Divergence Pathologies",
  citation: bib.shinn2023reflexion,
  source: bib.shinn2023reflexion,
  definition: terms => [
Selhání agentní smyčky, při němž další iterace nepřibližují běh k cíli.
  ],
  description: terms => [
Projevem může být opakování neúčinných kroků nebo pokračování bez měřitelného pokroku; mechanismy reflexe a zpětné vazby jsou jedním ze způsobů, jak takové opakované selhání omezovat. #cite(bib.shinn2023reflexion)
  ],
  relations: ((type: "related", target: "loop_engineering"),),
)
