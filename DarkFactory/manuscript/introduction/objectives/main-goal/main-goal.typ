#import "/DarkFactory/templates/common.typ": finalized
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "main_goal",
  title: [Hlavní cíl],
  definition: terms => [
#finalized[
Zjistit, jak lze současnou agentní AI účinně používat při vývoji softwaru, a navrhnout architekturu agent harnessu, která podporuje vysokou míru autonomie při zachování lidského dohledu v důležitých rozhodnutích.
]
  ],
  description: terms => [
DarkFactory slouží jako konkrétní návrh této architektury.
  ],
)
