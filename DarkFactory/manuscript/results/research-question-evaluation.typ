#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "research_question_evaluation",
  czech: "Odpovědi na výzkumné otázky",
  english: "Research Question Answers",
  definition: terms => [
Odpovědi na výzkumné otázky jsou omezeny na vlastnosti doložené implementací, automatickými testy, CI a dostupnými provozními artefakty.
  ],
  description: terms => [
*O1.* Řízenou autonomii umožňuje kombinace explicitního Planning Approval, oddělené implementace, deterministického ověření, review/fix smyčky, Final Alignment a samostatné merge autorizace. Tyto mechanismy oddělují práci, kterou může systém provádět automaticky, od rozhodovacích bodů, které zůstávají pod lidskou kontrolou. Jejich dílčí kontrakty jsou implementované a testované. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_ci_35616745304) Bez jednoho živého průchodu celým Request lifecycle však evidence zatím neprokazuje chování této autonomie v úplném produkčním běhu; stejná podmínka zůstává otevřená v acceptance #359. #cite(bib.darkfactory_request_359)

*O2.* Neproduktivní nebo přerušený běh lze omezovat pomocí turn/time budgetů, klasifikace chyb a modelového failoveru a obnovovat pomocí persistovaného Run State a recovery provenance. Testy ověřují zachování historie při failoveru, round-trip stavu a odmítnutí neplatného nebo citlivého recovery vstupu. #cite(bib.darkfactory_e9c10221) Tato evidence podporuje implementovaný mechanismus obnovy; neprokazuje ještě živou crash/resume idempotenci nad reálnými externími účinky, která zůstává součástí otevřeného #359 acceptance. #cite(bib.darkfactory_request_359)

*O3.* Trvalý stav dlouhotrvající úlohy je oddělen od context window tím, že Run State, Session a Transcript mohou existovat mimo aktuální inferenční vstup a aktivní kontext se z nich sestavuje pouze v rozsahu potřebném pro další krok. Testy ověřují persistenci Run State a recovery vazby na aktuální base a provenance. #cite(bib.darkfactory_e9c10221) Tento návrh umožňuje pokračování přes hranice jednotlivých modelových běhů, ale nedokazuje nulovou informační ztrátu pro libovolně dlouhou úlohu ani univerzální kvalitu výběru nebo kompakce kontextu.
  ],
  relations: (),
)
