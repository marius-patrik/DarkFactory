#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_routing",
  industry: "Routing",
  czech: "Směrování",
  english: "Routing",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Mechanismus vykonávacího jádra pro výběr vhodného modelu, poskytovatele nebo dalšího prováděcího kandidáta podle požadavků běhu.
  ],
  description: terms => [
Routing je součástí `@darkfactory/core` a používá sdílené modelové a kvótové kontrakty; jeho konkrétní chování musí být v praktické části doloženo aktuální implementací a testy.
  ],
  relations: ((type: "dependency", target: "darkfactory_system"),),
)
