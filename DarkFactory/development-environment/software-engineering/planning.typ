#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(id: "planning", proper: translation(cs: "Plánování", en: "Planning"), explanation_cs: "Proces převodu požadavku na explicitní posloupnost kroků, závislostí a ověřovacích podmínek před prováděním změn.", explanation_en: "The process of turning a requirement into an explicit sequence of steps, dependencies, and verification conditions before changes are executed.", keyword: false, citation: bib.sommerville2016, source: bib.sommerville2016)

#let item = concept(
  key: "planning",
  term: terminology,
  heading: terms => [#finalized[Plánování \[Planning\]]],
  theory_enabled: true,
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