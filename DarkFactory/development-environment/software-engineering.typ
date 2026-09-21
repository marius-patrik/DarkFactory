#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "software_engineering",
  czech: "Softwarové inženýrství",
  english: "Software Engineering",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
  definition: terms => [
Systematické uplatňování inženýrských principů na specifikaci, návrh, implementaci, ověřování, provoz a údržbu softwarových systémů.
  ],
  description: terms => [
V agentním vývoji zasazuje generování kódu do řízeného procesu požadavků, změn, automatického ověřování a revize.
  ],
  relations: (),
)
