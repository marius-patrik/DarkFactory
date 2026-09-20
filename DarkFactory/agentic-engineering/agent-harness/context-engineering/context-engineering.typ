#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "context-engineering",
    proper: translation(cs: "Kontextové inženýrství", en: "Context Engineering"),
    explanation_cs: "Systematický návrh, výběr, pořadí a životní cyklus informací zpřístupňovaných modelu v aktivním kontextu, včetně instrukcí, paměti, nástrojových výsledků a externě načtených dat.",
    explanation_en: "The systematic design, selection, ordering, and lifecycle management of information made available to a model in active context, including instructions, memory, tool results, and externally retrieved data.",
    citation: bib.liu2024,
    source: bib.jiang2023llmlingua,
)

#let item = concept(
  key: "context_engineering",
  term: terminology,
  definition: none,
  description: none,
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "context_window"),),
)
