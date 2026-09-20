#import "../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "../../schema.typ": concept

#let terminology = define-term(
    id: "software-engineering",
    proper: translation(cs: "Softwarové inženýrství", en: "Software Engineering"),
    explanation_cs: "Systematické uplatňování inženýrských principů na specifikaci, návrh, implementaci, ověřování, provoz a údržbu softwarových systémů.",
    explanation_en: "The systematic application of engineering principles to the specification, design, implementation, verification, operation, and maintenance of software systems.",
    citation: bib.sommerville2016,
    source: bib.sommerville2016,
)

#let item = concept(
  key: "software_engineering",
  term: terminology,
  theory_enabled: false,
  theory_intro: terms => [
#accepted[
#term(terms.software_engineering, render: "both", detail-language: "cs", detail-style: "inline").
]
  ],
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
  relations: ()
)
