#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_architecture",
  title: [Návrh systému DarkFactory],
  definition: terms => [
Tato část popisuje architekturu DarkFactory podle aktuální implementace a jejích veřejných balíčkových a protokolových hranic.
  ],
  description: terms => [
DarkFactory odděluje vykonávací mechanismy, verzované capabilities, GitHub integraci, credential boundaries a operátorská rozhraní do samostatných komponent s explicitními odpovědnostmi. Následující podsekce vycházejí z aktuálního produktového kontraktu a zdrojového kódu, nikoli z plánované kompatibilní mezivrstvy nebo historické architektury. #cite(bib.darkfactory)
  ],
)
