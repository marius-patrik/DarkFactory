#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "handoff",
  term: "Předání řízení",
  keyword: "Handoff",
  citation: bib.openai_agent_orchestration,
  source: bib.openai_agent_orchestration,
  definition: terms => [
Vzor koordinace, při kterém aktivní agent předá další řízení specializovanému agentovi. #cite(bib.openai_agent_orchestration)
  ],
  description: terms => [
Handoff se liší od centralizované orchestrace tím, že specialista není pouze zavolán jako dílčí pracovní jednotka a vrácen orchestrátoru, ale přebírá aktivní pokračování interakce nebo úlohy. #cite(bib.openai_agent_orchestration)
  ],
  relations: ((type: "dependency", target: "subagent"), (type: "related", target: "orchestrator")),
)
