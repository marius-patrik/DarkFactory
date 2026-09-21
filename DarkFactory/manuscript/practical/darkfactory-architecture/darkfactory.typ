#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_system",
  industry: "DarkFactory",
  czech: "DarkFactory",
  english: "DarkFactory",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Autonomní systém pro řízený vývoj softwaru, který spojuje agentní běh, verzované capabilities a GitHub jako trvalou řídicí vrstvu.
  ],
  description: terms => [
Aktuální implementace je rozdělena do samostatných balíčků pro protokol, vykonávací jádro, capability systém, GitHub integraci, správu přihlašovacích údajů, autentizaci, dokumentaci, CLI a webové rozhraní.
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "agentic_engineering")),
)
