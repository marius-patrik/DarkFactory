#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "plugins",
    proper: translation(cs: "Rozšíření", en: "Plugins"),
    industry: translation(cs: "Plugins", en: "Plugins"),
    citation: bib.deepseekharness2026,
    source: bib.deepseekharness2026,
)

#let item = concept(
  key: "plugins",
  term: terminology,
  definition: terms => [
Plugin je programové rozšíření běžící přímo v prostředí harnessu, které může doplnit exekuční jádro o systémové adaptéry, ovladače nástrojů nebo deterministické záchytné body.
  ],
  description: terms => [
#unconfirmed[
Plugin rozšiřuje samotný harness programovým modulem. Na rozdíl od instrukční dovednosti tak může přidávat systémové adaptéry, ovladače nástrojů nebo deterministické zásahy přímo do běhové vrstvy.
]
  ],
  summary: terms => [
Plugin patří do exekuční vrstvy harnessu a používá se tehdy, když rozšíření vyžaduje programové chování namísto pouhých instrukcí pro model.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)