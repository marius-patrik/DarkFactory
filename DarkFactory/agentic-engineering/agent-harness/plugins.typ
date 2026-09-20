#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "plugins",
    proper: translation(cs: "Rozšíření", en: "Plugins"),
    industry: translation(cs: "Plugins", en: "Plugins"),
    explanation_cs: "Rozšíření běžící přímo v prostředí harnessu, která rozšiřují jeho exekuční jádro o specializované systémové adaptéry, ovladače nástrojů a deterministické záchytné body.",
    explanation_en: "Programmatic extension modules running directly in the harness environment that extend its execution core with specialized system adapters, tool drivers, and deterministic hooks.",
    citation: bib.deepseekharness2026,
    source: bib.deepseekharness2026,
)

#let item = concept(
  key: "plugins",
  term: terminology,
  definition: none,
  description: terms => [
#unconfirmed[
Plugin rozšiřuje samotný harness programovým modulem. Na rozdíl od instrukční dovednosti tak může přidávat systémové adaptéry, ovladače nástrojů nebo deterministické zásahy přímo do běhové vrstvy.
]
  ],
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)