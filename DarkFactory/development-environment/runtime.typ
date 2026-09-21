#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "runtime",
  industry: "Runtime",
  czech: "Běhové prostředí",
  english: "Runtime Environment",
  citation: bib.merkel2014docker,
  source: bib.merkel2014docker,
  definition: terms => [
Běhové prostředí je prostředí, ve kterém se program nebo agent vykonává a využívá procesy, souborový systém, síť a další systémové prostředky.
  ],
  description: terms => [
Runtime určuje skutečné nástroje, soubory a oprávnění dostupné agentovi a může být omezen kontejnerem nebo sandboxem.
  ],
  relations: ((type: "related", target: "sandbox"),),
)
