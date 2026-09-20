#import "../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../schema.typ": concept

#let terminology = define-term(
    id: "agent",
    proper: translation(cs: "Agent", en: "Agent"),
    explanation_cs: "Softwarový systém řízený jazykovým modelem a vybavený nástroji, který samostatně plánuje, vnímá stav prostředí a provádí vícekrokové akce směřující k dosažení zadaného inženýrského cíle.",
    explanation_en: "A software system driven by a language model and equipped with tools that independently plans, observes its environment, and performs multi-step actions toward a specified engineering goal.",
  )

#let item = concept(
  key: "agent",
  term: terminology,
  heading: terms => [#finalized[#term(terms.agent, marker: false, linked: false, emphasized: false) vs. #term(terms.chatbot, marker: false, linked: false, emphasized: false)]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#accepted[
#term(terms.chatbot, render: "both", detail-language: "cs", detail-style: "inline"). #term(terms.agent, render: "both", detail-language: "cs", detail-style: "inline"). Rozdíl mezi nimi nespočívá v odlišném jazykovém modelu, ale v architektuře jeho zapojení do pracovního prostředí.

Srovnání obou přístupů:
- Konverzační chatbot:
  - Reaguje pouze na přímé textové výzvy v uzavřeném okně chatu.
  - Nemá přímý přístup k souborovému systému ani k nástrojům operačního systému.
  - Uživatel musí navržený kód ručně zkopírovat, vložit do projektu a otestovat.
- Autonomní agent:
  - Je vybaven sadou výkonných nástrojů (_tools_) pro práci s repozitářem.
  - Aktivně prozkoumává soubory, modifikuje zdrojový kód, spouští testy a interpretuje jejich návratové kódy.
  - Funguje v autonomní prováděcí smyčce, v níž iterativně reaguje na reálnou odezvu vývojového prostředí.
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
  relations: (),
)
