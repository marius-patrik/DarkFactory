#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_run_state",
  industry: "Run State",
  czech: "Stav běhu",
  english: "Run State",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Persistovaná reprezentace aktuálního průběhu workflow, která umožňuje vykonávacímu jádru navázat na předchozí stav místo opakování dokončených účinků.
  ],
  description: terms => [
V DarkFactory patří správa graph/run state do vykonávacího jádra a používá sdílené serializované kontrakty z protokolu.
  ],
  relations: ((type: "dependency", target: "darkfactory_protocol"), (type: "related", target: "state")),
)
