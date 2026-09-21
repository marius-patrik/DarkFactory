#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_recovery",
  industry: "Recovery",
  czech: "Obnova běhu",
  english: "Recovery",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Mechanismus DarkFactory pro bezpečné převzetí zachovaného rozpracovaného stavu a rozhodnutí, zda lze předchozí Planning a další důkazy znovu použít.
  ],
  description: terms => [
Recovery ověřuje původ zachovaného stavu, změny požadavku a base SHA, pravidla publikace a podmínky bezpečného odstranění dočasného recovery stavu.
  ],
  relations: ((type: "dependency", target: "darkfactory_run_state"),),
)
