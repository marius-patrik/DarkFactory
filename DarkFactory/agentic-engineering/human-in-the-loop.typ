#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "human_in_the_loop",
  keyword: true,
  industry: "HITL",
  czech: "Zapojení člověka do smyčky",
  english: "Human-in-the-loop",
  citation: bib.mosqueira2023human,
  source: bib.mosqueira2023human,
  definition: terms => [
Uspořádání automatizovaného procesu, ve kterém člověk v určených bodech poskytuje zpětnou vazbu, schválení nebo rozhodnutí. #cite(bib.mosqueira2023human)
  ],
  description: terms => [
HITL ponechává vybraná rozhodnutí člověku místo úplné automatizace. V agentním workflow může být lidský zásah explicitní přechod nebo schvalovací bod, po kterém automatizované provádění pokračuje. #cite(bib.mosqueira2023human)
  ],
  relations: ((type: "related", target: "guardrail"), (type: "related", target: "goal_loops")),
)
