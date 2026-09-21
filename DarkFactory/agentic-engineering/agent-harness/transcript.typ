#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "transcript",
  term: "Přepis",
  keyword: "Transcript",
  citation: (bib.openai_agents_sessions, bib.anthropic_managed_agents),
  source: bib.anthropic_managed_agents,
  definition: terms => [
Uspořádaný historický záznam událostí nebo položek vzniklých během Session, například zpráv, tahů a výsledků nástrojů. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
Transcript odpovídá na otázku, co se během běhu stalo. Není totožný se State, který zachovává aktuální pracovní skutečnosti, ani s aktivním kontextem, který obsahuje pouze informace právě předané modelu. Persistovaný transcript lze při pokračování použít k rekonstrukci potřebného kontextu. #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "parent", target: "agent_session"), (type: "related", target: "state"), (type: "related", target: "context_engineering")),
)
