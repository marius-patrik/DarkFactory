#import "../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../schema.typ": concept

#let terminology = define-term(
    id: "embedding",
    proper: translation(cs: "Vektorová reprezentace", en: "Embedding"),
    industry: translation(cs: "Embedding", en: "Embedding"),
    explanation_cs: "Vícerozměrná vektorová reprezentace tokenů nebo jiných dat, v níž numerické vztahy mezi vektory zachycují užitečné sémantické vztahy mezi reprezentacemi.",
    explanation_en: "A multidimensional vector representation of tokens or other data in which numerical relationships between vectors capture useful semantic relationships between representations.",
  )

#let item = concept(
  key: "embedding",
  term: terminology,
  heading: terms => [#term(terms.embedding, marker: false, linked: false, emphasized: false)],
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
  relations: (),
)
