#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "state",
  industry: "State",
  czech: "Stav",
  english: "State",
  citation: bib.anthropic_managed_agents,
  source: bib.anthropic_managed_agents,
  definition: terms => [
Persistovaná reprezentace skutečností a řídicích údajů, které musí harness zachovat mezi jednotlivými kroky běhu.
  ],
  description: terms => [
Stav je odlišný od transcriptu i aktivního kontextu: nemusí obsahovat úplnou historii a nemusí být v každém kroku celý předán modelu. #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "parent", target: "agent_session"), (type: "related", target: "transcript"), (type: "related", target: "context_engineering")),
)
