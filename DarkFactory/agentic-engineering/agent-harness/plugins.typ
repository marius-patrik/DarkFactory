#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "plugins",
  industry: "Plugins",
  czech: "Rozšíření",
  english: "Plugins",
  citation: bib.deepseekharness2026,
  source: bib.deepseekharness2026,
  definition: terms => [
Programové rozšíření běžící přímo v prostředí harnessu, které může doplnit exekuční jádro o systémové adaptéry, ovladače nástrojů nebo deterministické záchytné body.
  ],
  description: terms => [
Na rozdíl od instrukční dovednosti mění plugin programové chování běhové vrstvy harnessu. #cite(bib.deepseekharness2026)
  ],
  relations: ((type: "dependency", target: "harness"),),
)
