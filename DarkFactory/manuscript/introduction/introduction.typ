#import "/DarkFactory/templates/common.typ": finalized
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "thesis_introduction",
  czech: "Úvod",
  english: "Introduction",
  definition: terms => [
#finalized[
Tato práce zkoumá, jak dnes účinně využívat agentní umělou inteligenci při vývoji softwaru.
]
  ],
  description: terms => [
#finalized[
Zaměřuje se na to, co současní agenti dokážou samostatně provést a jaké prostředí, nástroje a pravidla potřebují, aby jejich práce byla opakovatelná a kontrolovatelná.

Praktickým příkladem je DarkFactory, na kterém jsou popsané principy převedeny do konkrétní architektury a vývojového procesu. Cílem úvodu je stručně vymezit, co práce zkoumá, proč je téma aktuální a podle čeho bude navržené řešení posuzováno.
]
  ],
)
