#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "integration_test",
  term: "Integrační test",
  keyword: "Integration Test",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
  definition: terms => [
Ověření spolupráce více komponent nebo vrstev systému přes jejich rozhraní. #cite(bib.sommerville2016)
  ],
  description: terms => [
Integrační test zachycuje chyby vznikající ve vzájemném propojení částí systému, které izolované testování jednotlivých komponent nemusí odhalit. #cite(bib.sommerville2016)
  ],
  practical: terms => [
Integrační test ověřuje spolupráci více částí systému, a proto zachytí chyby, které izolovaná kontrola jednotlivého modulu nebo generovaného souboru neodhalí.
  ],
  relations: ((type: "related", target: "continuous_integration"),),
)
