#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "transcript",
  term: "Přepis",
  keyword: "Transcript",
  citation: (bib.openai_agents_sessions, bib.anthropic_managed_agents),
  source: bib.anthropic_managed_agents,
  definition: terms => [
Uspořádaný historický záznam událostí vzniklých během #term(terms.agent_session), například zpráv, akcí a výsledků nástrojů. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
Transcript odpovídá na otázku, co se během běhu stalo. Je historickým záznamem, nikoli reprezentací právě platného pracovního stavu. #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "parent", target: "agent_session"), (type: "related", target: "state"), (type: "related", target: "context_engineering")),
)
