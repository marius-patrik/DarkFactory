#import "/DarkFactory/templates/common.typ": finalized
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "main_goal",
  czech: "Hlavní cíl",
  english: "Main Goal",
  definition: terms => [
#finalized[
Zjistit, jak lze současnou agentní AI účinně používat při vývoji softwaru, a navrhnout architekturu agent harnessu, která podporuje vysokou míru autonomie při zachování lidského dohledu v důležitých rozhodnutích.
]
  ],
  description: terms => [
DarkFactory slouží jako konkrétní návrh této architektury.
  ],
)
