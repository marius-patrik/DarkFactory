#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "main_goal",
  title: [Hlavní cíl],
  definition: terms => [
Navrhnout, implementovat a ověřit architekturu agentního harnessu pro dlouhotrvající vývoj softwaru, která odděluje jazykový model od trvalého stavu, prostředí a kontrolních mechanismů a umožňuje autonomní provádění změn při zachování explicitních bodů lidského rozhodnutí.
  ],
  description: terms => [
DarkFactory je implementační artefakt této architektury. Úspěšnost cíle se neposuzuje podle obecné převahy nad jinými agenty, ale podle toho, zda implementace doložitelně realizuje navržené mechanismy a zda jimi projde ověřený end-to-end vývojový proces.
  ],
)
