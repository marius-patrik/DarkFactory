#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "loop-engineering",
    proper: translation(cs: "Inženýrství prováděcí smyčky", en: "Execution-loop Engineering"),
    industry: translation(cs: "Loop Engineering", en: "Loop Engineering"),
    citation: bib.yao2022,
    source: bib.deepseekharness2026,
)

#let item = concept(
  key: "loop_engineering",
  term: terminology,
  definition: terms => [
Inženýrství prováděcí smyčky je návrh a řízení stavových přechodů, podmínek ukončení, rozpočtů, opakování, eskalací a vazby mezi rozhodováním modelu a nástroji.
  ],
  description: terms => [
#unconfirmed[
Inženýrství prováděcí smyčky odděluje provozní řízení od samotného modelového rozhodování. Patří sem stavové přechody, podmínky ukončení, rozpočty běhu, opakování po selhání, detekce uvíznutí a pravidla pro eskalaci nebo lidské schválení.
]
  ],
  summary: terms => [
Loop engineering převádí otevřenou agentní iteraci na provozně ohraničený proces s explicitními pravidly pokračování, selhání a ukončení.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "divergence"),),
)