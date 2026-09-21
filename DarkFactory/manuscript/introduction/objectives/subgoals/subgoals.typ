#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "subgoals",
  czech: "Dílčí cíle",
  english: "Sub-goals",
  definition: terms => [
- Vymezit infrastrukturu pro správu verzí a průběžné automatické ověřování změn.
- Popsat limity modelového kontextu, jeho správu a mechanismy pro dlouhotrvající agentní úlohy.
- Popsat nástrojové a prováděcí mechanismy současného agentního harnessu.
- Navrhnout způsob, jak zachovat lidský dohled nad důležitými rozhodnutími bez nutnosti ručně provádět každou rutinní změnu.
  ],
  description: terms => [
Dílčí cíle rozkládají hlavní cíl na vývojové prostředí, práci s modelem a kontextem, řízení agentního běhu a lidskou kontrolu. Každá oblast je dále rozpracována jako samostatné koncepty.
  ],
  relations: ((type: "dependency", target: "main_goal"),),
)
