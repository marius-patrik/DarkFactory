#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "workflow_graphs",
  term: "Pracovní graf",
  keyword: "Workflow Graph",
  citation: (bib.wu2023autogen, bib.anthropic2024tooluse),
  source: bib.wu2023autogen,
  definition: terms => [
Explicitní grafová reprezentace vícefázového workflow, v níž uzly představují dílčí práci a hrany určují přechody nebo závislosti mezi kroky. #cite(bib.wu2023autogen)
  ],
  description: terms => [
Workflow Graph může vyjádřit sekvenční, podmíněné i paralelní větvení a může koordinovat více agentů. Pokud hrany vyjadřují pouze acyklické závislosti, může mít podobu DAG; workflow s návraty nebo opakováním však obecně DAG být nemusí. #cite(bib.wu2023autogen) #cite(bib.anthropic2024tooluse)
  ],
  relations: ((type: "related", target: "orchestrator"), (type: "related", target: "subagent")),
)
