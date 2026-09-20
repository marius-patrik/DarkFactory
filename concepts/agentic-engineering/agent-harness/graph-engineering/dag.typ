#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../../schema.typ": concept

#let terminology = define-term(
    id: "dag",
    proper: translation(cs: "Orientovaný acyklický graf", en: "Directed Acyclic Graph"),
    industry: translation(cs: "DAG", en: "DAG"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Orientovaný graf bez orientovaného cyklu. V pracovních postupech umožňuje explicitně vyjádřit závislosti mezi kroky a pořadí, které z nich vyplývá.",
    explanation_en: "A directed graph containing no directed cycle. In workflows it can explicitly represent dependencies among steps and the ordering implied by those dependencies.",
  )

#let item = concept(
  key: "dag",
  term: terminology,
  heading: terms => [#term(terms.dag, marker: false, linked: false, emphasized: false)],
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
  relations: ((type: "dependency", target: "graph_engineering"),)
)
