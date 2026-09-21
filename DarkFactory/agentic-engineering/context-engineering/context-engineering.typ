#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_engineering",
  term: "Kontextové inženýrství",
  keyword: "Context Engineering",
  citation: (bib.anthropic_context_engineering, bib.liu2024),
  source: bib.anthropic_context_engineering,
  definition: terms => [
Systematický výběr a správa informací, které jsou modelu zpřístupněny v aktivním kontextu během inference. #cite(bib.anthropic_context_engineering)
  ],
  description: terms => [
Aktivní kontext může obsahovat instrukce, popisy dostupných nástrojů, externí data a vybranou historii interakce. Jeho obsah je nutné kurátorovat vzhledem k omezené kapacitě a nerovnoměrnému využití dlouhého kontextu. #cite(bib.anthropic_context_engineering) #cite(bib.liu2024)
  ],
  relations: ((type: "dependency", target: "context_window"), (type: "related", target: "state"), (type: "related", target: "transcript")),
)
