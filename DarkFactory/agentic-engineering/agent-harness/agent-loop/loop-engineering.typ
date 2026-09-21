#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "loop_engineering",
    industry: "Loop Engineering",
  czech: "Inženýrství prováděcí smyčky",
  english: "Execution-loop Engineering",
  citation: bib.yao2022,
  source: bib.deepseekharness2026,
definition: terms => [
Inženýrství prováděcí smyčky je návrh a řízení stavových přechodů, podmínek ukončení, rozpočtů, opakování, eskalací a vazby mezi rozhodováním modelu a nástroji.
  ],
  description: terms => [
#finalized[
Harness tak může nezávisle na modelu omezit počet iterací, ukončit neproduktivní běh, opakovat selhaný krok nebo vyžádat lidské schválení.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "divergence"),),
)