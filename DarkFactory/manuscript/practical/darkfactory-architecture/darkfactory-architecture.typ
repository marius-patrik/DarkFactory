#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_architecture",
  czech: "Architektura DarkFactory",
  english: "DarkFactory Architecture",
  definition: terms => [
Architektura DarkFactory je konkrétní uspořádání komponent agentního harnessu do jednoho vývojového systému.
  ],
  description: terms => [
Spojuje modelovou, stavovou, nástrojovou a kontrolní vrstvu do řízeného toku provádění softwarových úloh.
  ],
  relations: ((type: "dependency", target: "harness_engineering"),),
)
