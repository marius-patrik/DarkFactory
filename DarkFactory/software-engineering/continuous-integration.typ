#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "continuous_integration",
  keyword: true,
  industry: "CI",
  czech: "Průběžná integrace",
  english: "Continuous Integration",
  citation: bib.humble2010,
  source: bib.humble2010,
  definition: terms => [
Vývojová praxe, při níž se změny průběžně integrují a automaticky ověřují sestavením, testy a dalšími kontrolami. #cite(bib.humble2010)
  ],
  description: terms => [
CI převádí část podmínek kvality do opakovatelných strojově vyhodnotitelných kontrol spouštěných nad změnami. #cite(bib.humble2010)
  ],
  relations: ((type: "dependency", target: "version_control"),),
)
