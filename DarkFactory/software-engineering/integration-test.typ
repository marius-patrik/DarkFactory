#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "integration_test",
  industry: "Integration Test",
  czech: "Integrační test",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
  definition: terms => [
Ověření spolupráce více komponent nebo vrstev systému přes jejich rozhraní. #cite(bib.sommerville2016)
  ],
  description: terms => [
Integrační test zachycuje chyby vznikající ve vzájemném propojení částí systému, které izolované testování jednotlivých komponent nemusí odhalit. #cite(bib.sommerville2016)
  ],
  relations: ((type: "related", target: "continuous_integration"),),
)
