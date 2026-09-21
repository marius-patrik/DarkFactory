#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "transcript",
  industry: "Transcript",
  czech: "Přepis",
  english: "Transcript",
  citation: bib.openai_agents_sessions,
  source: bib.openai_agents_sessions,
  definition: terms => [
Uspořádaný záznam položek vzniklých během session, například zpráv, tahů a výsledků nástrojů.
  ],
  description: terms => [
Persistovaná historie umožňuje rekonstruovat předchozí průběh a vybírat informace pro pokračování dalšího běhu. #cite(bib.openai_agents_sessions)
  ],
  relations: ((type: "dependency", target: "agent_session"), (type: "related", target: "context_engineering")),
)
