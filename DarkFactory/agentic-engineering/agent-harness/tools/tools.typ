#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "tools",
  term: "Nástroje",
  keyword: "Tools",
  citation: (bib.schick2023toolformer, bib.anthropic2024tooluse),
  source: bib.anthropic2024tooluse,
  definition: terms => [
Rozhraní, kterým agent vyvolává operace mimo samotnou textovou inferenci, například čtení dat, volání API nebo změnu stavu systému. #cite(bib.anthropic2024tooluse)
  ],
  description: terms => [
Harness zprostředkuje požadavek na nástroj, provede operaci v prostředí a vrátí její výsledek modelu jako další pozorování. #cite(bib.schick2023toolformer) #cite(bib.anthropic2024tooluse)
  ],
  practical: terms => [
Nástroje umožňují agentovi spouštět příkazy, číst soubory, volat API, spouštět testy a pracovat se skutečnými výsledky místo jejich predikování.
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "agent_loop")),
)
