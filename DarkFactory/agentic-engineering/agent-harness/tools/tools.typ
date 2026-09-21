#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "tools",
  keyword: true,
  industry: "Tools",
  czech: "Nástroje",
  english: "Tools",
  citation: (bib.schick2023toolformer, bib.anthropic2024tooluse),
  source: bib.anthropic2024tooluse,
  definition: terms => [
Rozhraní, kterým agent vyvolává operace mimo samotnou textovou inferenci, například čtení dat, volání API nebo změnu stavu systému.
  ],
  description: terms => [
Harness zprostředkuje požadavek na nástroj, provede operaci v prostředí a vrátí její výsledek modelu jako další pozorování. #cite(bib.schick2023toolformer) #cite(bib.anthropic2024tooluse)
  ],
  relations: ((type: "dependency", target: "plugins"), (type: "related", target: "agent_loop")),
)
