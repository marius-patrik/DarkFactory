#import "/DarkFactory/templates/common.typ": finalized, term, bib
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
Průběžná integrace (CI) je vývojová praxe, při níž se změny často integrují a automaticky ověřují sestavením, testy a dalšími kontrolami.
  ],
  description: terms => [#finalized[
Kód vytvořený jazykovým modelem nelze považovat za ověřený pouze proto, že byl vygenerován. CI poskytuje opakovatelnou kontrolu sestavení, testů a dalších strojově vyhodnotitelných podmínek. #cite(bib.humble2010)
  ]],
  relations: ((type: "dependency", target: "version_control"),),
)
