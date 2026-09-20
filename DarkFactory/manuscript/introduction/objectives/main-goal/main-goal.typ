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
Cíl spojuje popis současných agentních postupů s návrhem konkrétního systému DarkFactory. Výsledná architektura má podporovat samostatné provádění vývojových úloh a současně zachovat jasná místa pro lidskou kontrolu.
  ],
  summary: terms => [
Výsledkem práce má být použitelný návrh agentního harnessu a popis principů, které umožňují současnou agentní AI efektivně zapojit do vývoje softwaru.
  ],
)
