#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_capability",
  industry: "Capability",
  czech: "Capability",
  english: "Capability",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Verzovaný modul DarkFactory, který přidává agentní nebo produktové chování přes jednotné rozhraní.
  ],
  description: terms => [
Capability může deklarovat nástroje, příkazy, detektory, graph contributions, verifikaci, hooks, deterministické akce, credential requirements a publikační surfaces.
  ],
  relations: ((type: "dependency", target: "darkfactory_system"), (type: "related", target: "plugins")),
)
