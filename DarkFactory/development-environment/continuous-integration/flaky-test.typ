#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "flaky-test",
  proper: translation(cs: "Nestálý test", en: "Flaky Test"),
  industry: translation(cs: "Flaky Test", en: "Flaky Test"),
  citation: bib.humble2010,
  source: bib.humble2010,
)

#let item = concept(
  key: "flaky_test",
  term: terminology,
  definition: terms => [
Nestálý test je test, který může nad stejným kódem střídavě projít a selhat kvůli nedeterminismu, časování, prostředí nebo externím službám.
  ],
  description: terms => [
#unconfirmed[
Nestálé testy oslabují roli CI jako deterministické zpětné vazby. Agent může náhodné selhání mylně interpretovat jako regresi a začít měnit správný kód; proto je vhodné zdroje nedeterminismu omezovat a podezřelé běhy ověřovat opakováním v čistém prostředí.
]
  ],
  summary: terms => [
Nestálé testy snižují informační hodnotu CI a mohou agenta vést k opravám správného kódu; podezřelé selhání proto musí být reprodukovatelné nebo explicitně označené jako nedeterministické.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "continuous_integration"),),
)
