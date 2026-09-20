#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "merge",
    industry: "Merge",
  czech: "Sloučení větví",
  english: "Branch Merge",
  citation: bib.chacon2014,
  source: bib.chacon2014,
definition: terms => [
Merge je operace správy verzí, která kombinuje změny nebo historii dvou vývojových linií do společného výsledného stavu; případné konflikty vyžadují explicitní vyřešení.
  ],
  description: terms => [
#unconfirmed[
Způsob, jakým se změny z pracovní větve začlení do větve hlavní, má zásadní dopad na dlouhodobou udržitelnost a čitelnost repozitáře. Autonomní agent při řešení úlohy obvykle postupuje iterativní metodou pokus-omyl: upraví soubor, spustí testy, odhalí překlep a provede další drobný commit. V pracovní větvi tak vzniká dlouhá sekvence pomocných a experimentálních záznamů.

Zatímco klasický merge commit přenese do hlavní větve veškeré dílčí commity a rebase je lineárně přeskládá, v agentním vývoji se jako optimální strategie uplatňuje Commit and Merge @chacon2014:
- Sloučení mezikroků (#term(terms.squash, language: "en", marker: false, linked: false, emphasized: false)): Všechny commity z pracovní větve jsou spojeny do jediného nového commitu, který je vložen do `main`.
- Eliminace interního šumu: Pomocné commity vzniklé při ladění testů se do hlavní větve vůbec nedostanou; historie projektu zůstává čistá a přehledná podle pravidla: jeden úkol = jeden commit.
- Atomický návrat změn (`git revert`): Pokud se v budoucnu ukáže, že začleněná úprava zanesla do produkce nečekanou vadu, lze celý úkol vrátit jediným atomickým příkazem bez nutnosti rozplétat desítky dílčích mezikroků.
]
  ],
  summary: terms => [
Způsob sloučení určuje, jak se pracovní historie agenta promítne do stabilní větve; před integrací je vhodné oddělit užitečný výsledný stav od experimentálních mezikroků.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "branch"),),
)