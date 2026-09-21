#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "handoff",
  industry: "Handoff",
  czech: "Předání řízení",
  english: "Handoff",
  citation: bib.openai_agent_orchestration,
  source: bib.openai_agent_orchestration,
  definition: terms => [
Vzor koordinace, při kterém aktivní agent předá řízení specializovanému agentovi, jenž převezme další část interakce nebo úlohy.
  ],
  description: terms => [
Handoff se liší od centralizovaného orchestrátoru tím, že specialista není pouze zavolán jako dílčí nástroj, ale stává se aktivním vlastníkem pokračování běhu. #cite(bib.openai_agent_orchestration)
  ],
  relations: ((type: "dependency", target: "subagent"), (type: "related", target: "orchestrator")),
)
