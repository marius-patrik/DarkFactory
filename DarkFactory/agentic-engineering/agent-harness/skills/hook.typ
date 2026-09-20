#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

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
  definition: none,
  description: terms => [
#unconfirmed[
Hook váže deterministickou logiku na konkrétní událost životního cyklu harnessu, například před spuštěním nástroje, po dokončení kroku nebo při změně stavu běhu.
]
  ],
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)