#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "guardrail",
  proper: translation(cs: "Deterministický mantinel", en: "Deterministic Guardrail"),
  industry: translation(cs: "Guardrail", en: "Guardrail"),
)

#let item = concept(
  key: "guardrail",
  term: terminology,
  definition: terms => [
Guardrail je programově vynucené omezení nebo kontrola, která neponechává kritické provozní pravidlo pouze na pravděpodobnostním rozhodnutí modelu.
  ],
  description: terms => [
#unconfirmed[
Pokud samotná instrukce v promptu neposkytuje dostatečnou záruku, harness může pravidlo vynutit deterministicky, například omezením přístupových práv, validací parametrů nástroje nebo odmítnutím nepovoleného stavového přechodu.
]
  ],
  summary: terms => [
Kritická bezpečnostní a procesní pravidla patří do deterministicky vynucované vrstvy harnessu, nikoli pouze do textových instrukcí modelu.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "sandbox"), (type: "related", target: "loop_engineering")),
)
