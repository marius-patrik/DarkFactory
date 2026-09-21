#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "capability_abi",
  industry: "Capability ABI",
  czech: "ABI capabilities",
  english: "Capability ABI",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Verzovaný kontrakt určující strukturu a kompatibilitu capability modulů DarkFactory.
  ],
  description: terms => [
Aktuální ABI definuje metadata, credential requirements, nástroje, příkazy, detektory, graph contributions, verifikační pravidla, hooks, actions a další surfaces, které capability může poskytovat.
  ],
  relations: ((type: "dependency", target: "darkfactory_capability"),),
)
