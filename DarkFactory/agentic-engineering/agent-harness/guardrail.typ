#import "/DarkFactory/templates/common.typ": translation, unconfirmed
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "guardrail",
    industry: "Guardrail",
  czech: "Deterministický mantinel",
  english: "Deterministic Guardrail",
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
