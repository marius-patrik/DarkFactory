#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "state",
  industry: "State",
  czech: "Stav",
  english: "State",
  citation: bib.anthropic_managed_agents,
  source: bib.anthropic_managed_agents,
  definition: terms => [
Persistovaná reprezentace aktuálních skutečností a řídicích údajů, které musí harness zachovat mezi jednotlivými kroky běhu. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
State odpovídá na otázku, co je pro pokračování právě platné. Nemusí obsahovat úplnou historii Transcriptu a nemusí být celý předán modelu; Context Engineering vybírá, která část dostupného stavu a historie vstoupí do aktivního kontextu. #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "parent", target: "agent_session"), (type: "related", target: "transcript"), (type: "related", target: "context_engineering")),
)
