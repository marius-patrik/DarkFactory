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
Plugin je programové rozšíření běžící přímo v prostředí harnessu, které může doplnit exekuční jádro o systémové adaptéry, ovladače nástrojů nebo deterministické záchytné body.
  ],
  description: terms => [
Plugin rozšiřuje běhovou vrstvu harnessu programovou komponentou; pluginové systémy jsou příkladem dynamické kompozice komponent. #cite(bib.deepseekharness2026)
  ],
  relations: ((type: "dependency", target: "harness"),),
)
