#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "software_engineering",
  industry: "Software Engineering",
  czech: "Softwarové inženýrství",
  english: "Software Engineering",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
  definition: terms => [
Systematické uplatňování inženýrských principů na specifikaci, vývoj, ověřování, provoz a údržbu softwarových systémů. #cite(bib.sommerville2016)
  ],
  description: terms => [
Pro tuto práci poskytuje procesní rámec, ve kterém musí být změny nejen vytvořeny, ale také řízeny, ověřeny a integrovány.
  ],
  relations: (),
)
