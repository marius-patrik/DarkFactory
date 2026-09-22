#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "agents_directory",
  keyword: ".agents/",
  citation: bib.openai_customization_overview,
  source: bib.openai_customization_overview,
  definition: terms => [
`.agents/` je repozitářový nebo uživatelský jmenný prostor Codexu pro znovupoužitelná agentní rozšíření, zejména Skills. #cite(bib.openai_customization_overview)
  ],
  description: terms => [
Repozitářové Skills se ukládají do `.agents/skills` a uživatelské do `~/.agents/skills`; AGENTS.md zůstává samostatnou vrstvou projektových instrukcí a není podadresářem `.agents/`. #cite(bib.openai_customization_overview)
  ],
  practical: terms => [
Adresář `.agents/` umožňuje držet repozitářové dovednosti a jejich podpůrné prostředky blízko kódu, který je používá, a verzovat je společně s projektem.
  ],
  relations: ((type: "related", target: "agents_md"), (type: "related", target: "skills"), (type: "related", target: "scripts")),
)
