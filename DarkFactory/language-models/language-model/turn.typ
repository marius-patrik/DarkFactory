#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "turn",
    industry: "Turn",
  czech: "Tah interakce",
  english: "Interaction Turn",
  citation: bib.yao2022,
  source: bib.yao2022,
definition: terms => [
Tah je jedna diskrétní jednotka interakce v konverzačním nebo agentním protokolu, například zpráva uživatele, výstup modelu nebo samostatně evidovaný výsledek nástroje.
  ],
  description: terms => [
Historie tahů tvoří část pracovního kontextu; harness rozhoduje, které vstupy, modelová rozhodnutí a výsledky nástrojů zůstanou dostupné v dalších iteracích.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "context_window"),),
)