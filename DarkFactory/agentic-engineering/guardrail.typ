#import "/DarkFactory/templates/common.typ": finalized
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "guardrail",
  keyword: true,
  industry: "Guardrail",
  czech: "Deterministický mantinel",
  english: "Deterministic Guardrail",
  definition: terms => [#finalized[
Guardrail je programově vynucené omezení nebo kontrola, která neponechává kritické provozní pravidlo pouze na pravděpodobnostním rozhodnutí modelu.
  ]],
  description: terms => [#finalized[
Pokud samotná instrukce v promptu neposkytuje dostatečnou záruku, harness může pravidlo vynutit deterministicky, například omezením přístupových práv, validací parametrů nástroje nebo odmítnutím nepovoleného stavového přechodu. Kritická bezpečnostní a procesní pravidla patří do deterministicky vynucované vrstvy harnessu, nikoli pouze do textových instrukcí modelu.
  ]],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "sandbox"), (type: "related", target: "loop_engineering")),
)
