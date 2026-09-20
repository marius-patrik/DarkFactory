#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../../schema.typ": concept

#let terminology = define-term(
    id: "context-engineering",
    proper: translation(cs: "Kontextové inženýrství", en: "Context Engineering"),
    explanation_cs: "Systematický návrh, výběr, pořadí a životní cyklus informací zpřístupňovaných modelu v aktivním kontextu, včetně instrukcí, paměti, nástrojových výsledků a externě načtených dat.",
    explanation_en: "The systematic design, selection, ordering, and lifecycle management of information made available to a model in active context, including instructions, memory, tool results, and externally retrieved data.",
  )

#let item = concept(
  key: "context_engineering",
  term: terminology,
  heading: terms => [#term(terms.context_engineering, marker: false, linked: false, emphasized: false)],
  theory_enabled: false,
  theory_intro: none,
  theory_body: none,
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "context_window"),)
)
