#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "subagent",
  industry: "Subagent",
  czech: "Podřízený agent",
  english: "Subagent",
  citation: (bib.wu2023autogen, bib.openai_agent_orchestration),
  source: bib.openai_agent_orchestration,
  definition: terms => [
Specializovaná agentní instance, které jiný agent nebo orchestrátor deleguje vymezenou dílčí úlohu.
  ],
  description: terms => [
Subagent umožňuje oddělit roli, instrukce a pracovní kontext dílčí úlohy od koordinujícího běhu a následně vrátit výsledek zpět nadřazené orchestrace. #cite(bib.wu2023autogen) #cite(bib.openai_agent_orchestration)
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "orchestrator"), (type: "related", target: "workflow_graphs")),
)
