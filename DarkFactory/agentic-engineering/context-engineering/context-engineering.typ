#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_engineering",
  keyword: true,
  industry: "Context Engineering",
  czech: "Kontextové inženýrství",
  english: "Context Engineering",
  citation: (bib.anthropic_context_engineering, bib.liu2024),
  source: bib.anthropic_context_engineering,
  definition: terms => [
Systematický výběr a správa informací, které jsou modelu zpřístupněny v aktivním kontextu během inference. #cite(bib.anthropic_context_engineering)
  ],
  description: terms => [
Kontext zahrnuje nejen prompt, ale také nástroje, externí data a historii zpráv; jeho obsah je nutné průběžně kurátorovat vzhledem k omezené kapacitě a nerovnoměrnému využití dlouhého kontextu. #cite(bib.anthropic_context_engineering) #cite(bib.liu2024)
  ],
  relations: ((type: "dependency", target: "context_window"),),
)
