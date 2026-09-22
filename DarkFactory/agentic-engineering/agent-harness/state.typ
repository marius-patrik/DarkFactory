#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "state",
  term: "Stav",
  keyword: "State",
  citation: bib.anthropic_managed_agents,
  source: bib.anthropic_managed_agents,
  definition: terms => [
Persistovaná reprezentace aktuálně platných pracovních skutečností a řídicích údajů běhu. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
State odpovídá na otázku, co je pro další krok právě platné; na rozdíl od #term(terms.transcript) nemusí zachovávat úplnou historii předchozích událostí. #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "parent", target: "agent_session"), (type: "related", target: "transcript"), (type: "related", target: "context_engineering")),
)
