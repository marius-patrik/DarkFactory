#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "turn",
  industry: "Turn",
  czech: "Tah interakce",
  citation: bib.yao2022,
  source: bib.yao2022,
  definition: terms => [
Jedna diskrétní jednotka interakce v konverzačním nebo agentním protokolu, například zpráva uživatele, výstup modelu nebo samostatně evidovaný výsledek nástroje.
  ],
  description: terms => [
Historie tahů tvoří část pracovního kontextu; harness rozhoduje, které vstupy, modelová rozhodnutí a výsledky nástrojů zůstanou dostupné v dalších iteracích.
  ],
  relations: ((type: "dependency", target: "context_window"),),
)
