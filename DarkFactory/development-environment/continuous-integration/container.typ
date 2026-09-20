#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "container",
    proper: translation(cs: "Softwarový kontejner", en: "Software Container"),
    industry: translation(cs: "Container", en: "Container"),
    explanation_cs: "Izolované uživatelské běhové prostředí balící aplikaci a její závislosti při sdílení jádra hostitelského operačního systému; úroveň bezpečnostní izolace závisí na konkrétní implementaci a konfiguraci.",
    explanation_en: "An isolated user-space runtime packaging an application and its dependencies while sharing the host operating-system kernel; its security isolation depends on the implementation and configuration.",
    citation: bib.merkel2014docker,
    source: bib.merkel2014docker,
)

#let item = concept(
  key: "container",
  term: terminology,
  heading: terms => [#term(terms.container, marker: false, linked: false, emphasized: false)],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#unconfirmed[
Kontejner může CI běhu poskytnout opakovatelné uživatelské prostředí s deklarovanými nástroji a závislostmi. Tím omezuje vliv lokální konfigurace vývojářského počítače, aniž by sám o sobě zaručoval úplnou bezpečnostní izolaci.
]
  ],
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