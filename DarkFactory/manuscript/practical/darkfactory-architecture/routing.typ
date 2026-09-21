#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_routing",
  industry: "Model Routing",
  czech: "Směrování modelu",
  english: "Model Routing",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Mechanismus vykonávacího jádra pro výběr vhodného modelu, poskytovatele a účtu podle požadavků úlohy, dostupnosti a provozních omezení.
  ],
  description: terms => [
Model Routing je součástí `@darkfactory/core`; vyhodnocuje vhodnost kandidátů podle task kind, capability tier, kontextové kapacity, kvót a dostupnosti. Samotné přepínání mezi kandidáty při selhání řídí Supervisor.
  ],
  relations: ((type: "dependency", target: "darkfactory_system"),),
)
