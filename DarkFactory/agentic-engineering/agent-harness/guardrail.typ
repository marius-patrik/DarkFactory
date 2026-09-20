#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "guardrail",
  proper: translation(cs: "Deterministický mantinel", en: "Deterministic Guardrail"),
  industry: translation(cs: "Guardrail", en: "Guardrail"),
  explanation_cs: "Programově vynucené omezení nebo kontrola, která neponechává kritické provozní pravidlo pouze na pravděpodobnostním rozhodnutí modelu.",
  explanation_en: "A programmatically enforced constraint or check that does not leave a critical operating rule solely to a model's probabilistic decision.",
)

#let item = concept(
  key: "guardrail",
  term: terminology,
  theory_enabled: true,
  theory_body: terms => [
#unconfirmed[
Pokud samotná instrukce v promptu neposkytuje dostatečnou záruku, harness může pravidlo vynutit deterministicky, například omezením přístupových práv, validací parametrů nástroje nebo odmítnutím nepovoleného stavového přechodu.
]
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "sandbox"), (type: "related", target: "loop_engineering"))
)
