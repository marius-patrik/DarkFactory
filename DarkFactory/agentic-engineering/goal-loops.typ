#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "goal_loops",
  term: "Cílené smyčky",
  keyword: "Goal Loops",
  citation: (bib.yao2022, bib.anthropic2024tooluse),
  source: bib.anthropic2024tooluse,
  definition: terms => [
V této práci označují řídicí smyčky, které opakují jednání podle explicitního cíle, pozorovaného výsledku a podmínky dalšího pokračování nebo ukončení.
  ],
  description: terms => [
Na rozdíl od samotného běhového Agent Loopu zahrnuje Goal Loop také zpětnou vazbu k dosažení cíle, ověření výsledku a rozhodnutí, zda pokračovat, změnit postup nebo běh ukončit. #cite(bib.yao2022) #cite(bib.anthropic2024tooluse)
  ],
  relations: ((type: "dependency", target: "agent_loop"), (type: "related", target: "guardrail"), (type: "related", target: "human_in_the_loop")),
)
