#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agent_session",
  industry: "Session",
  czech: "Agentní sezení",
  english: "Agent Session",
  citation: (bib.openai_agents_sessions, bib.anthropic_managed_agents),
  source: bib.openai_agents_sessions,
  definition: terms => [
Persistovaná jednotka agentní interakce, která umožňuje navazovat na předchozí průběh mezi jednotlivými běhy. #cite(bib.openai_agents_sessions)
  ],
  description: terms => [
Session uchovává historii nebo event log mimo okamžitý modelový kontext a při pokračování z něj lze znovu sestavit relevantní vstup. #cite(bib.openai_agents_sessions) #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "child", target: "turn"), (type: "child", target: "transcript"), (type: "child", target: "state"), (type: "related", target: "context_engineering")),
)
