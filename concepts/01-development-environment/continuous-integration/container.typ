#import "../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../schema.typ": concept

#let terminology = define-term(
    id: "container",
    proper: translation(cs: "Softwarový kontejner", en: "Software Container"),
    industry: translation(cs: "Container", en: "Container"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Izolované uživatelské běhové prostředí balící aplikaci a její závislosti při sdílení jádra hostitelského operačního systému; úroveň bezpečnostní izolace závisí na konkrétní implementaci a konfiguraci.",
    explanation_en: "An isolated user-space runtime packaging an application and its dependencies while sharing the host operating-system kernel; its security isolation depends on the implementation and configuration.",
  )

#let item = concept(
  key: "container",
  term: terminology,
  heading: terms => [#term(terms.container, marker: false, linked: false, emphasized: false)],
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
