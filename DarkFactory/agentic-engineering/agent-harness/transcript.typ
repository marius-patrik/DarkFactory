#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "transcript",
  industry: "Transcript",
  czech: "Přepis",
  english: "Transcript",
  definition: terms => [
Uspořádaný záznam zpráv, tahů, volání nástrojů, jejich výsledků a dalších událostí vzniklých během agentního sezení.
  ],
  description: terms => [
Slouží k rekonstrukci průběhu sezení, auditu a výběru informací, které se mají znovu vložit do aktivního kontextu.
  ],
  relations: ((type: "dependency", target: "agent_session"), (type: "related", target: "context_engineering")),
)
