#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "orchestrator",
  industry: "Orchestrator",
  czech: "Orchestrátor",
  english: "Orchestrator",
  citation: (bib.openai_agent_orchestration, bib.anthropic2024tooluse),
  source: bib.openai_agent_orchestration,
  definition: terms => [
Koordinační role nebo komponenta, která rozhoduje, kterému specializovanému agentovi předat dílčí práci a jak jeho výsledek začlenit do pokračujícího běhu. #cite(bib.openai_agent_orchestration)
  ],
  description: terms => [
Centralizovaný orchestrátor zůstává vlastníkem hlavního workflow a může specialisty volat jako omezené pracovní jednotky, případně jejich práci kombinovat nebo spouštět paralelně. #cite(bib.openai_agent_orchestration) #cite(bib.anthropic2024tooluse)
  ],
  relations: ((type: "dependency", target: "subagent"), (type: "related", target: "workflow_graphs")),
)
