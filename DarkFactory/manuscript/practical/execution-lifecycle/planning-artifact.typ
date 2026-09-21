#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_planning",
  industry: "Planning",
  czech: "Plánování DarkFactory",
  english: "DarkFactory Planning",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Verzovaný a revidovaný plánovací artefakt, který převádí konkrétní Request a aktuální stav repozitáře na závazný rámec implementace a ověření.
  ],
  description: terms => [
Planning zachovává verbatim Request, acceptance criteria, behavioral contract, scope, exclusions, dependencies, sequencing, verification a známé či ještě zjišťované implementační vlastníky.
  ],
  relations: ((type: "dependency", target: "darkfactory_request"), (type: "related", target: "planning")),
)
