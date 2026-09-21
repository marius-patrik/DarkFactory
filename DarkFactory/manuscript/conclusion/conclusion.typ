#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "conclusion",
  title: [Závěr],
  definition: terms => [
Práce ukazuje, že praktické použití agentní AI při vývoji softwaru nelze redukovat na samotné generování kódu jazykovým modelem; rozhodující část systému tvoří harness, který spravuje stav, prostředí, nástroje, ověřování a řídicí hranice.
  ],
  description: terms => [
Na systému DarkFactory byla tato architektura rozložena do explicitních runtime, capability, GitHub, identity a operátorských hranic. Referenční commit DarkFactory prošel automatickou quality pipeline a hlavní testovací sada vykázala 670 úspěšných testů bez selhání; samostatné testy ověřují mimo jiné persistenci Run State, Planning review, modelový failover, deterministické zachycení výsledku, recovery provenance a oddělení browserové autentizace od strojových credentials. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_ci_35616745304)

Výsledky podporují architektonickou odpověď na výzkumné otázky: řízená autonomie vyžaduje explicitní schvalovací a verifikační body, odolnost běhu vyžaduje persistovaný stav a kontrolovaný failover/recovery a kontinuita dlouhotrvající úlohy nemůže být závislá pouze na modelovém context window.

V evidence setu uzavřeném 21. září 2026 nebyl prokázán jeden živý df-only průchod celým Request lifecycle od schválení Planningu po merge a rekonciliaci; stejná podmínka zůstala otevřenou acceptance položkou Requestu #359. #cite(bib.darkfactory_request_359) Práce proto nevyvozuje obecnou výkonnostní převahu DarkFactory ani úplnou autonomii; tato tvrzení zůstávají mimo rozsah provedené evaluace.
  ],
)
