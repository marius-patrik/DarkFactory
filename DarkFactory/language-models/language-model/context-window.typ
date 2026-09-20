#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "context-window",
    proper: translation(cs: "Kontextové okno", en: "Context Window"),
    citation: bib.liu2024,
    source: bib.vaswani2017,
)

#let item = concept(
  key: "context_window",
  term: terminology,
  definition: terms => [
Kontextové okno je maximální rozsah tokenové sekvence, kterou model při jednom inferenčním běhu dokáže zahrnout do aktivního kontextu.
  ],
  description: terms => [
Do tohoto limitu se společně započítávají systémové instrukce, uživatelský vstup, historie běhu, výsledky nástrojů a další data předaná modelu. Omezení proto přímo ovlivňuje, kolik pracovního stavu může agent udržovat současně bez výběru, externí paměti nebo kompakce.
  ],
  summary: terms => [
Kontextové okno je konečný pracovní prostor inference; harness musí aktivně rozhodovat, které informace v něm zůstanou.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "token"),),
)