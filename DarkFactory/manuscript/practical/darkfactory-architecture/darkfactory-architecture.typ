#import "/DarkFactory/templates/common.typ": critique
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_architecture",
  czech: "Architektura DarkFactory",
  english: "DarkFactory Architecture",
  definition: terms => [
Konkrétní uspořádání komponent agentního harnessu do jednoho vývojového systému.
  ],
  description: terms => [
Spojuje modelovou, stavovou, nástrojovou a kontrolní vrstvu do řízeného toku provádění softwarových úloh.

#critique[Tato část zatím popisuje architekturu pouze obecně. Před finalizací doplnit skutečné komponenty DarkFactory, jejich rozhraní, tok stavu a ověřené vazby na implementaci; nevymýšlet je pouze z návrhového záměru.]
  ],
  relations: ((type: "dependency", target: "harness_engineering"),),
)
