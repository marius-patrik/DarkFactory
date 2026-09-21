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
HITL ponechává část rozhodovacího procesu člověku místo úplné automatizace a používá lidský zásah jako součást řízení nebo kontroly systému. #cite(bib.mosqueira2023human)
  ],
  relations: ((type: "related", target: "guardrail"),),
)
