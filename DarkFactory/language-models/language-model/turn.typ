#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "turn",
    proper: translation(cs: "Tah interakce", en: "Interaction Turn"),
    industry: translation(cs: "Turn", en: "Turn"),
    citation: bib.yao2022,
    source: bib.yao2022,
)

#let item = concept(
  key: "turn",
  term: terminology,
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