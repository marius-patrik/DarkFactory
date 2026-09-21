#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "results_discussion_body",
  title: [Diskuse],
  definition: terms => [
Dosavadní evidence podporuje architektonické oddělení modelového rozhodování od deterministických mechanismů stavu, verifikace, credentials a obnovy, ale zatím nepodporuje obecné tvrzení o vyšší výkonnosti nebo úplné autonomii.
  ],
  description: terms => [
Silnou stránkou evaluace je přímá vazba mezi jednotlivými tvrzeními a implementačními nebo testovacími důkazy: například výsledek kódového kroku je odvozován z pracovního stromu a scope checku místo textového tvrzení modelu a recovery kontrakt je testován proti neplatné provenance i citlivému obsahu. #cite(bib.darkfactory_e9c10221)

Slabší část evidence leží na úrovni celého systému. Jednotlivé mechanismy a jejich integrace jsou automaticky testovány a referenční quality run je zelený, ale živá end-to-end demonstrace celého Request lifecycle a ověření na cílové fleetě musí být doplněny dříve, než budou výzkumné otázky uzavřeny finálními odpověďmi.
  ],
)
