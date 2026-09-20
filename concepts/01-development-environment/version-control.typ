#import "../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../schema.typ": concept

#let terminology = define-term(
    id: "version-control",
    proper: translation(cs: "Správa verzí", en: "Version control"),
    explanation_cs: "Správa a sledování změn zdrojových souborů a dalších verzovaných artefaktů tak, aby bylo možné změny bezpečně větvit, slučovat, auditovat a v případě potřeby vracet.",
    explanation_en: "The management and tracking of changes to source files and other versioned artifacts so changes can be safely branched, merged, audited, and reverted when necessary.",
  )

#let item = concept(
  key: "version_control",
  term: terminology,
  heading: terms => [#finalized[Správa verzí \[Version Control\]]],
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
  related: (),
)
