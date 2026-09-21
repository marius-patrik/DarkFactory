#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_engineering",
  keyword: true,
  czech: "Kontextové inženýrství",
  english: "Context Engineering",
  citation: bib.liu2024,
  source: bib.jiang2023llmlingua,
  definition: terms => [
Kontextové inženýrství je systematický výběr, pořadí a životní cyklus informací zpřístupňovaných modelu v aktivním kontextu.
  ],
  description: terms => [
Určuje, které instrukce, pracovní stav, výsledky nástrojů a externí data model právě vidí a jak se tento obsah mění při omezené kapacitě kontextového okna.
  ],
  relations: ((type: "dependency", target: "context_window"),),
)
