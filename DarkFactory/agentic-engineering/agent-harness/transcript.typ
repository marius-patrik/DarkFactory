#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "transcript",
  industry: "Transcript",
  czech: "Přepis",
  english: "Transcript",
  citation: (bib.openai_agents_sessions, bib.anthropic_managed_agents),
  source: bib.anthropic_managed_agents,
  definition: terms => [
Uspořádaný záznam událostí nebo položek vzniklých během session, například zpráv, tahů a výsledků nástrojů. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
Persistovaný záznam umožňuje rekonstruovat předchozí průběh a později z něj vybrat informace pro pokračování běhu, aniž by musel být celý současně v kontextovém okně. #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "parent", target: "agent_session"), (type: "related", target: "context_engineering")),
)
