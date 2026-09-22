#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agents_md",
  keyword: "AGENTS.md",
  citation: bib.openai_agents_md,
  source: bib.openai_agents_md,
  definition: terms => [
AGENTS.md je mechanismus projektových instrukcí Codexu, který dodává agentovi trvalý repozitářový kontext před zahájením práce. #cite(bib.openai_agents_md)
  ],
  description: terms => [
Codex hledá instrukce od kořene repozitáře směrem k aktuálnímu pracovnímu adresáři, skládá je v tomto pořadí a bližší instrukce tak dostávají vyšší prioritu; na úrovni adresáře může AGENTS.override.md nahradit AGENTS.md. #cite(bib.openai_agents_md)
  ],
  practical: terms => [
AGENTS.md umožňuje udržovat repozitářové instrukce přímo u kódu a automaticky je přidávat do kontextu Codexu podle pracovního umístění.
  ],
  relations: ((type: "related", target: "system_prompt"), (type: "related", target: "context_engineering"), (type: "related", target: "agents_directory")),
)
