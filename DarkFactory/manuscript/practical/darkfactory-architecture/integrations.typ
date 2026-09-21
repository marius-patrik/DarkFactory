#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_external_integrations_body",
  title: [Externí integrace],
  definition: terms => [
Externí stav vývojového procesu zůstává v systémech, které jsou jeho autoritativním vlastníkem, místo vytváření paralelní databáze uvnitř DarkFactory.
  ],
  description: terms => [
GitHub v aktuální architektuře vlastní trvalý stav Requestů, pull requestů, kontrol, projektů, událostí a autorizace. DarkFactory nad ním používá typovanou integrační vrstvu `@darkfactory/github`; runtime graph může externí kontroly pozorovat, aniž by jejich stav duplikoval. #cite(bib.darkfactory)
  ],
)
