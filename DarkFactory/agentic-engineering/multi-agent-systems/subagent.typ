#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "subagent",
  keyword: "Subagent",
  citation: (bib.wu2023autogen, bib.openai_agent_orchestration),
  source: bib.openai_agent_orchestration,
  definition: terms => [
Specializovaná agentní instance, které jiný agent nebo orchestrátor deleguje vymezenou dílčí úlohu. #cite(bib.openai_agent_orchestration)
  ],
  description: terms => [
Subagent umožňuje oddělit roli, instrukce a pracovní kontext dílčí úlohy od koordinujícího běhu a následně vrátit výsledek zpět nadřazené orchestrace. #cite(bib.wu2023autogen) #cite(bib.openai_agent_orchestration)
  ],
  practical: terms => [
Subagent umožňuje oddělit dílčí úlohu do samostatného kontextu a paralelizovat nebo specializovat práci bez zahlcení hlavního agentního vlákna.
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "orchestrator"), (type: "related", target: "workflow_graphs")),
)
