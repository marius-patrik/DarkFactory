#import "../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../schema.typ": concept

#let terminology = define-term(
    id: "merge",
    proper: translation(cs: "Sloučení větví", en: "Branch Merge"),
    industry: translation(cs: "Merge", en: "Merge"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Operace správy verzí, která kombinuje změny nebo historii dvou vývojových linií do společného výsledného stavu; konflikty vyžadují explicitní vyřešení.",
    explanation_en: "A version-control operation that combines changes or history from two lines of development into a common resulting state; conflicts require explicit resolution.",
  )

#let item = concept(
  key: "merge",
  term: terminology,
  heading: terms => [#finalized[Slučování změn (Commit and Merge)]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#unconfirmed[
Způsob, jakým se změny z pracovní větve začlení do větve hlavní, má zásadní dopad na dlouhodobou udržitelnost a čitelnost repozitáře. Autonomní agent při řešení úlohy obvykle postupuje iterativní metodou pokus-omyl: upraví soubor, spustí testy, odhalí překlep a provede další drobný commit. V pracovní větvi tak vzniká dlouhá sekvence pomocných a experimentálních záznamů.

Zatímco klasický merge commit přenese do hlavní větve veškeré dílčí commity a rebase je lineárně přeskládá, v agentním vývoji se jako optimální strategie uplatňuje Commit and Merge:
- Sloučení mezikroků: Všechny commity z pracovní větve jsou spojeny do jediného nového commitu, který je vložen do `main`.
- Eliminace interního šumu: Pomocné commity vzniklé při ladění testů se do hlavní větve vůbec nedostanou; historie projektu zůstává čistá a přehledná podle pravidla: jeden úkol = jeden commit.
- Atomický návrat změn (`git revert`): Pokud se v budoucnu ukáže, že začleněná úprava zanesla do produkce nečekanou vadu, lze celý úkol vrátit jediným atomickým příkazem bez nutnosti rozplétat desítky dílčích mezikroků.
]
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  related: (),
)
