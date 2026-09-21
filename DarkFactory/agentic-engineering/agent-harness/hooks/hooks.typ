#import "/DarkFactory/templates/common.typ": finalized, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "hooks",
  industry: "Hooks",
  czech: "Událostní záchytné body",
  english: "Hooks",
  citation: bib.deepseekharness2026,
  source: bib.deepseekharness2026,
  definition: terms => [
Definované body životního cyklu nebo události, na které lze navázat vlastní deterministickou logiku před, po nebo místo standardního chování systému.
  ],
  description: terms => [#finalized[
Používají se například před spuštěním nástroje, po dokončení kroku nebo při změně stavu běhu.
  ]],
  relations: ((type: "dependency", target: "tools"),),
)
