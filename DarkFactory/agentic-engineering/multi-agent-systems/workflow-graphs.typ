#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "workflow_graphs",
  industry: "Graphs",
  czech: "Pracovní grafy",
  english: "Workflow Graphs",
  citation: (bib.wu2023autogen, bib.anthropic2024tooluse),
  source: bib.wu2023autogen,
  definition: terms => [
Explicitní grafová reprezentace vícefázového workflow, v níž uzly představují dílčí práci a hrany určují možné přechody nebo závislosti.
  ],
  description: terms => [
Workflow Graph může koordinovat sekvenční, podmíněné i paralelní kroky a může používat více agentů; pokud neobsahuje cykly a hrany vyjadřují pouze závislosti, lze jej realizovat jako DAG. #cite(bib.wu2023autogen)
  ],
  relations: ((type: "related", target: "dag"), (type: "related", target: "orchestrator"), (type: "related", target: "subagent")),
)
