#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_recovery_lifecycle_body",
  title: [Obnova a pokračování],
  definition: terms => [
Přerušení běhu, vyčerpání kvóty nebo konflikt nesmí samo o sobě zneplatnit již dokončené a ověřené deterministické účinky.
  ],
  description: terms => [
DarkFactory ukládá stav potřebný k pokračování a při recovery ověřuje jeho původ, změnu Requestu, base SHA a další podmínky bezpečného převzetí. Modelový nebo provider failover používá stejný princip: další kandidát pokračuje nad zachovaným stavem, místo aby bez kontroly opakoval již provedené účinky. #cite(bib.darkfactory)
  ],
)
