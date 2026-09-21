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
Kód vytvořený jazykovým modelem nelze považovat za ověřený pouze proto, že byl úspěšně vygenerován. CI poskytuje externí a opakovatelnou kontrolu sestavení, testů a dalších strojově vyhodnotitelných podmínek. #cite(bib.humble2010)

Konkrétní automatizační platformu popisuje #term(terms.github_actions), izolaci běhu #term(terms.container) a ověření spolupráce částí systému #term(terms.integration_test).
  ]],
  relations: ((type: "dependency", target: "version_control"),),
)
