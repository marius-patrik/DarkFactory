#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "technical_results_body",
  title: [Technické výsledky],
  definition: terms => [
Referenční CI run `35616745304` dokončil všech 15 jobů úspěšně, včetně detekce quality matrix, dokumentace, hlavní testovací sady, testů `@darkfactory/core`, `@darkfactory/keychain`, `@darkfactory/web`, capabilities a čtyř Python testovacích běhů. #cite(bib.darkfactory_ci_35616745304)
  ],
  description: terms => [
Hlavní Bun testovací sada vykázala 670 úspěšných testů v 102 souborech, 0 selhání a 2909 assertion volání. Samostatný test balíčku `@darkfactory/core` vykázal 9/9 úspěšných recovery-contract testů, `@darkfactory/keychain` 13/13 testů a vybraný webový testovací job 4/4. #cite(bib.darkfactory_ci_35616745304)

Testy současně ověřují konkrétní mechanismy používané v architektuře: atomické uložení Run State, detekci stale nebo driftovaného Planningu, zachování konverzační a nástrojové historie při provider failoveru, odvozování výsledku kódového kroku ze skutečně změněných souborů a commitů, blokování změn mimo povolený scope, recovery provenance a blokování secret-bearing recovery materiálu. #cite(bib.darkfactory_e9c10221)

Výsledek dokládá, že tyto mechanismy mají implementované automatické ověření a že referenční commit prošel deklarovanou quality pipeline. Neprokazuje sám o sobě úspěšnost libovolné autonomní softwarové úlohy.
  ],
)
