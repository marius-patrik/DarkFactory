#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "hook",
    industry: "Hook",
  czech: "Událostní záchytný bod",
  english: "Event Hook",
  citation: bib.deepseekharness2026,
  source: bib.deepseekharness2026,
definition: terms => [
Hook je definovaný bod životního cyklu nebo události, na který lze navázat vlastní deterministickou logiku před, po nebo místo standardního chování systému.
  ],
  description: terms => [
#unconfirmed[
Hook váže deterministickou logiku na konkrétní událost životního cyklu harnessu, například před spuštěním nástroje, po dokončení kroku nebo při změně stavu běhu.
]
  ],
  summary: terms => [
Hook umožňuje vynutit opakovatelné chování v přesně určeném okamžiku bez toho, aby model musel stejné pravidlo znovu odvozovat.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)