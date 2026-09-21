#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_integration_lifecycle_body",
  title: [Finalizace a integrace],
  definition: terms => [
Před merge je implementace znovu porovnána se schváleným Planningem a případnými schválenými změnami rozsahu.
  ],
  description: terms => [
Po Final Alignment následují požadované externí kontroly a finální review nebo merge autorizace. Teprve poté je změna integrována a DarkFactory deterministicky rekonciluje stav navázaných Requestů, pull requestů, projektu a bezpečně odstranitelných větví. #cite(bib.darkfactory)
  ],
)
