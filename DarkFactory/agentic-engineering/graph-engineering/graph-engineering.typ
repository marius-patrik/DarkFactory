#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "graph_engineering",
  industry: "Graph Engineering",
  czech: "Inženýrství pracovních grafů",
  english: "Workflow-graph Engineering",
  citation: bib.wu2023autogen,
  source: bib.wu2023autogen,
  definition: terms => [
V této práci označuje návrh vícefázových agentních workflow jako explicitních uzlů, závislostí a přechodů.
  ],
  description: terms => [
Grafová struktura umožňuje oddělit role a fáze, vyjádřit jejich závislosti a řídit, které části práce mohou probíhat sekvenčně nebo paralelně. Multiagentní orchestrace využívá obdobné dělení rolí a komunikace mezi agenty. #cite(bib.wu2023autogen)
  ],
  relations: ((type: "dependency", target: "agent_loop"), (type: "related", target: "subagent")),
)
