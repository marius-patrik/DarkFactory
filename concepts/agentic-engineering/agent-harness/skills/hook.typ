#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "../../../schema.typ": concept

#let terminology = define-term(
    id: "hook",
    proper: translation(cs: "Událostní záchytný bod", en: "Event Hook"),
    industry: translation(cs: "Hook", en: "Hook"),
    explanation_cs: "Definovaný bod životního cyklu nebo události, na který lze navázat vlastní deterministickou logiku před, po nebo místo standardního chování systému.",
    explanation_en: "A defined lifecycle or event point to which custom deterministic logic can be attached before, after, or in place of standard system behavior.",
    citation: bib.deepseekharness2026,
    source: bib.deepseekharness2026,
)

#let item = concept(
  key: "hook",
  term: terminology,
  heading: terms => [#term(terms.hook, marker: false, linked: false, emphasized: false)],
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
  relations: ()
)