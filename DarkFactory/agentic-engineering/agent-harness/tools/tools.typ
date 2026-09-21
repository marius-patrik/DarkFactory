#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "tools",
  keyword: true,
  industry: "Tools",
  czech: "Nástroje",
  english: "Tools",
  citation: bib.schick2023toolformer,
  source: bib.anthropic2024tooluse,
  definition: terms => [
Rozhraní zpřístupňující modelu operace mimo samotnou textovou inferenci, například čtení souboru, dotaz na API nebo změnu stavu systému.
  ],
  description: terms => [
Harness přijme požadavek modelu, zkontroluje parametry, provede příslušnou operaci a vrátí její výsledek do dalšího kroku běhu.
  ],
  relations: ((type: "dependency", target: "agent_loop"),),
)
