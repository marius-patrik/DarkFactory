#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "turn",
  industry: "Turn",
  czech: "Tah interakce",
  citation: bib.yao2022,
  source: bib.yao2022,
  definition: terms => [
Jedna diskrétní jednotka interakce v konverzačním nebo agentním běhu, například vstup uživatele, výstup modelu nebo výsledek nástroje. #cite(bib.yao2022)
  ],
  description: terms => [
Posloupnost tahů vytváří historii session; v agentní smyčce může výsledek jednoho tahu ovlivnit rozhodnutí v následujícím tahu. #cite(bib.yao2022)
  ],
  relations: ((type: "parent", target: "agent_session"), (type: "related", target: "agent_loop")),
)
