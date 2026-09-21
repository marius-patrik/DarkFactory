#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "research_question_evaluation",
  czech: "Vyhodnocení výzkumných otázek",
  english: "Research Question Evaluation",
  definition: terms => [
Průběžné přiřazení výzkumných otázek ke konkrétním implementačním a testovacím důkazům, které vymezuje, co lze z aktuální evaluace tvrdit a co ještě vyžaduje živý end-to-end důkaz.
  ],
  description: terms => [
*O1.* Implementace obsahuje explicitní Planning Approval, review/fix mechanismy, deterministic verification, Final Alignment a oddělené body merge autorizace; CI a testovací sada ověřují jejich dílčí kontrakty. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_ci_35616745304) To podporuje tvrzení, že architektura umí oddělit automatizované kroky od lidských rozhodovacích bodů. Bez jednoho živého průchodu celým Request lifecycle však zatím nelze uzavřít, jak se tato řízená autonomie chová v úplném produkčním běhu; stejný požadavek zůstává otevřený i v acceptance #359. #cite(bib.darkfactory_request_359)

*O2.* Supervisor a související testy ověřují provider/model failover, samostatné limity počtu tahů a času, klasifikaci chyb a zachování historie při pokračování. Recovery testy ověřují provenance, zachování rozpracovaného stavu a odmítnutí nebezpečného nebo neaplikovatelného recovery vstupu. #cite(bib.darkfactory_e9c10221) Tato evidence podporuje technickou realizaci omezení a obnovy běhu; živý crash/resume scénář s reálnými externími účinky zůstává součástí dosud neuzavřeného #359 acceptance. #cite(bib.darkfactory_request_359)

*O3.* Run State je samostatně persistován a testy ověřují jeho round-trip uložení a atomický zápis. Session a Transcript jsou odděleny od aktivního modelového kontextu a recovery kontrakt váže pokračování na zachovaný stav a aktuální base/provenance. #cite(bib.darkfactory_e9c10221) To podporuje architektonickou odpověď, že kontinuita dlouhotrvající úlohy nemá být závislá na tom, aby celý pracovní stav zůstal současně v context window. Evidence ale nedokazuje nulovou informační ztrátu pro libovolně dlouhou úlohu ani univerzální kvalitu kompakce.
  ],
  relations: (),
)
