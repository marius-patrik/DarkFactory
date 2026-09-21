#import "/DarkFactory/templates/common.typ": translation, finalized, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "flaky_test",
    industry: "Flaky Test",
  czech: "Nestálý test",
  english: "Flaky Test",
  citation: bib.humble2010,
  source: bib.humble2010,
definition: terms => [
Nestálý test je test, který může nad stejným kódem střídavě projít a selhat kvůli nedeterminismu, časování, prostředí nebo externím službám.
  ],
  description: terms => [
#finalized[
Nestálé testy oslabují roli CI jako deterministické zpětné vazby. Agent může náhodné selhání mylně interpretovat jako regresi a začít měnit správný kód; proto je vhodné zdroje nedeterminismu omezovat a podezřelé běhy ověřovat opakováním v čistém prostředí.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "continuous_integration"),),
)
