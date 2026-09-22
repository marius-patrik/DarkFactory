#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "swarm",
  keyword: "Swarm",
  citation: bib.kimi_k25_agent_swarm,
  source: bib.kimi_k25_agent_swarm,
  definition: terms => [
Swarm označuje dynamicky koordinované paralelní provádění úlohy více subagenty pod orchestrujícím agentem nebo systémem; nejde o univerzální formální standard.
  ],
  description: terms => [
Kimi K2.5 Agent Swarm je konkrétní realizace, v níž orchestrátor dynamicky vytváří a koordinuje paralelní subagenty bez předem definovaných rolí nebo ručně napsaného workflow. #cite(bib.kimi_k25_agent_swarm)
  ],
  practical: terms => [
Swarm umožňuje dynamicky rozdělit rozsáhlou úlohu mezi více paralelních subagentů, pokud zadání přirozeně obsahuje nezávislé části práce.
  ],
  relations: ((type: "related", target: "subagent"), (type: "related", target: "orchestrator"), (type: "related", target: "workflow_graphs"), (type: "related", target: "goal_loops")),
)
