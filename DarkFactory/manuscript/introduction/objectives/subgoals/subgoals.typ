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
Dílčí cíle pokrývají vývojové prostředí, kontext, provádění a lidský dohled.
  ],
  relations: ((type: "dependency", target: "main_goal"),),
)
