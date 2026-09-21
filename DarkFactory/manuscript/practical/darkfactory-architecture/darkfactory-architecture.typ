#import "/DarkFactory/templates/common.typ": critique
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_architecture",
  title: [Návrh systému DarkFactory],
  definition: terms => [
Konkrétní uspořádání komponent agentního harnessu do jednoho vývojového systému.
  ],
  description: terms => [
Spojuje modelovou, stavovou, nástrojovou a kontrolní vrstvu do řízeného toku provádění softwarových úloh.

#critique[Tato část zatím popisuje architekturu pouze obecně. Před finalizací doplnit skutečné komponenty DarkFactory, jejich rozhraní, tok stavu a ověřené vazby na implementaci; nevymýšlet je pouze z návrhového záměru.]
  ],
)
