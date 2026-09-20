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
Agentní běh skládá sekvenci tahů, v níž se střídají vstupy prostředí, modelová rozhodnutí a výsledky provedených akcí. Historie těchto tahů tvoří část pracovního kontextu a harness rozhoduje, které z nich zůstávají modelu dostupné v dalších iteracích.
  ],
  summary: terms => [
Tah je protokolová jednotka agentní interakce; odděluje jednotlivé vstupy, rozhodnutí a pozorování, z nichž harness sestavuje další kontext.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "context_window"),),
)