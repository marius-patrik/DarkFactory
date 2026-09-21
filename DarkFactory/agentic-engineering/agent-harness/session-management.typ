#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agent_session",
  term: "Agentní sezení",
  keyword: "Session",
  citation: (bib.openai_agents_sessions, bib.anthropic_managed_agents),
  source: bib.openai_agents_sessions,
  definition: terms => [
Persistovaná jednotka agentní interakce, která umožňuje navazovat na předchozí průběh mezi jednotlivými běhy. #cite(bib.openai_agents_sessions)
  ],
  description: terms => [
Session uchovává historii nebo záznam událostí mimo aktuální modelový kontext a při pokračování z něj lze znovu sestavit relevantní vstup. #cite(bib.openai_agents_sessions) #cite(bib.anthropic_managed_agents) V této práci Session zastřešuje jednotlivé tahy, jejich transcript a stav potřebný pro pokračování.
  ],
  relations: ((type: "child", target: "transcript"), (type: "child", target: "state"), (type: "related", target: "context_engineering")),
)
