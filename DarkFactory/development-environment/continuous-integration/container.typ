#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "container",
    proper: translation(cs: "Softwarový kontejner", en: "Software Container"),
    industry: translation(cs: "Container", en: "Container"),
    citation: bib.merkel2014docker,
    source: bib.merkel2014docker,
)

#let item = concept(
  key: "container",
  term: terminology,
  definition: terms => [
Softwarový kontejner je izolované uživatelské běhové prostředí, které balí aplikaci a její závislosti při sdílení jádra hostitelského operačního systému.
  ],
  description: terms => [
#unconfirmed[
Kontejner může CI běhu poskytnout opakovatelné uživatelské prostředí s deklarovanými nástroji a závislostmi. Tím omezuje vliv lokální konfigurace vývojářského počítače, aniž by sám o sobě zaručoval úplnou bezpečnostní izolaci.
]
  ],
  summary: terms => [
Kontejner zvyšuje reprodukovatelnost běhu, ale jeho bezpečnostní izolace závisí na konkrétní implementaci a konfiguraci.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)