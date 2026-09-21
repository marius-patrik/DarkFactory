#import "/DarkFactory/templates/common.typ": finalized, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "context_window",
    czech: "Kontextové okno",
  english: "Context Window",
  citation: bib.liu2024,
  source: bib.vaswani2017,
definition: terms => [#finalized[
Kontextové okno je maximální rozsah tokenové sekvence, kterou model při jednom inferenčním běhu dokáže zahrnout do aktivního kontextu.
  ]],
  description: terms => [#finalized[
Do tohoto limitu se společně započítávají systémové instrukce, uživatelský vstup, historie běhu, výsledky nástrojů a další data předaná modelu. Omezení proto přímo ovlivňuje, kolik pracovního stavu může agent udržovat současně bez výběru, externí paměti nebo kompakce.
  ]],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "token"),),
)