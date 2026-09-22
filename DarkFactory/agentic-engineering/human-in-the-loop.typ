#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "human_in_the_loop",
  term: "Člověk ve smyčce",
  keyword: "HITL",
  citation: bib.mosqueira2023human,
  source: bib.mosqueira2023human,
  definition: terms => [
Uspořádání automatizovaného procesu, ve kterém člověk v určených bodech poskytuje zpětnou vazbu, schválení nebo rozhodnutí. #cite(bib.mosqueira2023human)
  ],
  description: terms => [
HITL ponechává vybraná rozhodnutí člověku místo úplné automatizace. V agentním workflow může být lidský zásah explicitní přechod nebo schvalovací bod, po kterém automatizované provádění pokračuje. #cite(bib.mosqueira2023human)
  ],
  practical: terms => [
HITL umožňuje vyžádat lidské rozhodnutí před citlivou nebo nevratnou akcí a tím vložit explicitní schvalovací hranici do jinak automatického běhu.
  ],
  relations: ((type: "related", target: "guardrail"), (type: "related", target: "goal_loops")),
)
