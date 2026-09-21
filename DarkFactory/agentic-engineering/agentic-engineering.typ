#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agentic_engineering",
  keyword: true,
  industry: "Agentic Engineering",
  czech: "Agentické inženýrství",
  citation: bib.wang2024survey,
  source: bib.darkfactory,
  definition: terms => [
Návrh a provoz systémů kolem jazykových modelů, které zajišťují nástroje, kontext, stav, provádění, mantinely a lidský dohled.
  ],
  description: terms => [
Jeho předmětem je systém, který převádí modelový výstup na řízené a ověřitelné jednání, nikoli architektura nebo trénování samotného modelu.
  ],
  relations: ((type: "dependency", target: "agentic_ai"),),
)
