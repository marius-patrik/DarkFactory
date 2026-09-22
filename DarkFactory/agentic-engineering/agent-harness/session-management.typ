#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agent_session",
  term: "Agentní sezení",
  keyword: "Session",
  citation: (bib.openai_agents_sessions, bib.anthropic_managed_agents),
  source: bib.openai_agents_sessions,
  definition: terms => [
Persistovaná jednotka, která vymezuje jeden souvislý agentní běh a umožňuje jeho pozdější pokračování. #cite(bib.openai_agents_sessions)
  ],
  description: terms => [
Session je vlastníkem identity a hranice pokračujícího běhu; jeho historický průběh vlastní #term(terms.transcript) a aktuální pracovní skutečnosti #term(terms.state). #cite(bib.openai_agents_sessions) #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "child", target: "transcript"), (type: "child", target: "state"), (type: "related", target: "context_engineering")),
)
