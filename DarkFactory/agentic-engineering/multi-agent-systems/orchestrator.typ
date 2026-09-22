#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "orchestrator",
  term: "Orchestrátor",
  citation: (bib.openai_agent_orchestration, bib.anthropic2024tooluse),
  source: bib.openai_agent_orchestration,
  definition: terms => [
Koordinační role nebo komponenta, která rozhoduje, kterému specializovanému agentovi předat dílčí práci a jak jeho výsledek začlenit do pokračujícího běhu. #cite(bib.openai_agent_orchestration)
  ],
  description: terms => [
Centralizovaný orchestrátor zůstává vlastníkem hlavního workflow a může specialisty volat jako omezené pracovní jednotky, případně jejich práci kombinovat nebo spouštět paralelně. #cite(bib.openai_agent_orchestration) #cite(bib.anthropic2024tooluse)
  ],
  practical: terms => [
Orchestrátor rozděluje práci, spouští dílčí vykonavatele a skládá jejich výsledky, čímž umožňuje koordinovat více agentních větví jako jeden proces.
  ],
  relations: ((type: "dependency", target: "subagent"), (type: "related", target: "workflow_graphs")),
)
