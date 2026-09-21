#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agentic_engineering",
  keyword: true,
  industry: "Agentic Engineering",
  czech: "Agentické inženýrství",
  citation: (bib.wang2024survey, bib.anthropic2024tooluse, bib.anthropic_harness_design),
  source: bib.anthropic_harness_design,
  definition: terms => [
V této práci zastřešuje návrh systémů, které kolem jazykového modelu zajišťují nástroje, kontext, stav, provádění a kontrolní mechanismy.
  ],
  description: terms => [
Předmětem není trénování modelu, ale inženýrství systému, který z modelových rozhodnutí vytváří řízené akce nad prostředím. #cite(bib.wang2024survey) #cite(bib.anthropic2024tooluse)
  ],
  relations: ((type: "dependency", target: "harness"),),
)
