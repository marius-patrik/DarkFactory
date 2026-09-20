#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "flaky-test",
  proper: translation(cs: "Nestálý test", en: "Flaky Test"),
  industry: translation(cs: "Flaky Test", en: "Flaky Test"),
  explanation_cs: "Test, který může nad stejným kódem střídavě projít a selhat kvůli nedeterminismu, časování, závislosti na prostředí nebo externích službách.",
  explanation_en: "A test that can alternately pass and fail on the same code because of nondeterminism, timing, environment dependence, or external services.",
  citation: bib.humble2010,
  source: bib.humble2010,
)

#let item = concept(
  key: "flaky_test",
  term: terminology,
  theory_enabled: true,
  theory_body: terms => [
#unconfirmed[
Nestálé testy oslabují roli CI jako deterministické zpětné vazby. Agent může náhodné selhání mylně interpretovat jako regresi a začít měnit správný kód; proto je vhodné zdroje nedeterminismu omezovat a podezřelé běhy ověřovat opakováním v čistém prostředí.
]
  ],
  relations: ((type: "dependency", target: "continuous_integration"),)
)
