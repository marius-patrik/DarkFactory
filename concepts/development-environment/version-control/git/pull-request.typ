#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../../schema.typ": concept

#let terminology = define-term(
    id: "pull-request",
    proper: translation(cs: "Požadavek na sloučení", en: "Pull Request"),
    industry: translation(cs: "Pull Request", en: "Pull Request"),
    default-name-type: "industry",
    keyword-name-type: "both",
    explanation_cs: "Formální návrh na začlenění změn z jedné větve repozitáře do druhé, který slouží jako místo pro automatizované kontroly, lidskou revizi a diskusi nad navrženými úpravami.",
    explanation_en: "A formal proposal to integrate changes from one repository branch into another, providing a place for automated checks, human review, and discussion of the proposed changes.",
  )

#let item = concept(
  key: "pull_request",
  term: terminology,
  heading: terms => [#finalized[Pull Request]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#unconfirmed[
#diff[Pull request (PR) představuje stěžejní komunikační uzel mezi autonomním agentem a lidským inženýrem. Jedná se o formální žádost o začlenění navržených změn z pracovní větve do větve hlavní. V tomto bodě se plně uplatňuje princip zapojení člověka do smyčky (Human-in-the-loop):][#term(terms.pull_request, render: "both", detail-language: "cs", detail-style: "inline"). V tomto bodě se plně uplatňuje princip #term(terms.human_in_the_loop):] agent kód samostatně navrhne a otestuje, avšak konečné rozhodnutí o jeho přijetí náleží vývojáři.

Rozhraní pull requestu integruje všechny podstatné informace na jednom místě:
- Řádkový diff: Vizuální srovnání původního a nového stavu, kde jsou jasně barevně odlišeny přidané, změněné a smazané řádky.
- Strukturovaný souhrn změn: Agent v popisu PR srozumitelně shrne, jaké úpravy provedl, jakou logiku zvolil a na které původní issue reagoval.
- Výsledky automatických kontrol: Přehled stavu automatizovaných testů a linterů z GitHub Actions (zelený či červený indikátor).
- Revizní diskuse: Možnost vývojáře přidávat komentáře k libovolnému řádku kódu, klást doplňující dotazy nebo vyžadovat přepracování konkrétních částí.

Lidský vývojář v roli revizora (Reviewer) posuzuje celkový architektonický záměr a rozhoduje o schválení, vrácení k dopracování, či zamítnutí pull requestu.
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
  relations: ((type: "dependency", target: "branch"),)
)
