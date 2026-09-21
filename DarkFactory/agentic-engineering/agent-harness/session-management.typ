#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agent_session",
  industry: "Session",
  czech: "Agentní sezení",
  english: "Agent Session",
  citation: bib.openai_agents_sessions,
  source: bib.openai_agents_sessions,
  definition: terms => [
Ohraničený persistovaný stav interakce, který umožňuje navazovat na předchozí průběh agentního běhu.
  ],
  description: terms => [
Session ukládá historii interakce a při dalším běhu ji může znovu načíst do pracovního kontextu. #cite(bib.openai_agents_sessions)
  ],
  relations: ((type: "dependency", target: "turn"), (type: "related", target: "context_engineering")),
)
