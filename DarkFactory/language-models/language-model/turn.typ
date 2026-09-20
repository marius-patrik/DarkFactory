#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "turn",
    proper: translation(cs: "Tah interakce", en: "Interaction Turn"),
    industry: translation(cs: "Turn", en: "Turn"),
    explanation_cs: "Jedna diskrétní jednotka interakce v konverzačním nebo agentním protokolu, například zpráva uživatele, odpověď modelu nebo samostatně evidovaný výsledek nástroje.",
    explanation_en: "One discrete unit of interaction in a conversational or agentic protocol, such as a user message, model response, or separately recorded tool result.",
    citation: bib.yao2022,
    source: bib.yao2022,
)

#let item = concept(
  key: "turn",
  term: terminology,
  heading: terms => [Tahy a správa KV cache],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
Interakce mezi modelem, uživatelem a okolním vývojovým prostředím neprobíhá spojitě, nýbrž v diskrétních krocích označovaných jako tahy (_turns_). Každý tah představuje jednu ucelenou výměnu zprávy, na niž systém reaguje.

Životní cyklus tahů a správa paměti zahrnují:
- Typy tahů v agentní smyčce:
  - Tah uživatele či prostředí (_User Turn_): Nové zadání úkolu nebo vnější událost.
  - Tah modelu (_Model Turn_): Vygenerovaná odpověď nebo strukturovaný požadavek na spuštění nástroje.
  - Tah nástroje (_Tool Execution Turn_): Zpětné hlášení výsledku exekuce (výpis souboru, výstup kompilátoru).
- #diff[Správa KV cache (#term(terms.kv_cache, language: "en", marker: false, linked: false, emphasized: false))][Správa KV cache (#term(terms.kv_cache, language: "en", marker: false, linked: false, emphasized: false) @dao2022 @ainslie2023)]: Aby inferenční engine nemusel při každém novém tahu přepočítávat celou historii od začátku, ukládá mezivýpočty klíčů a hodnot matic pozornosti do paměti.
- #diff[Kontextové okno (#term(terms.context_window, language: "en", marker: false, linked: false, emphasized: false))][Kontextové okno (#term(terms.context_window, language: "en", marker: false, linked: false, emphasized: false) @vaswani2017)]: Pevně limitovaná kapacita paměti modelu. Tento strop je dán hardwarovými limity GPU akcelerátorů a kvadratickou složitostí plné pozornosti ($O(N^2)$ vzhledem k délce sekvence).
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: unconfirmed,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "context_window"),)
)