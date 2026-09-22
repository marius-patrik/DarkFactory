#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "scripts",
  term: "Skript",
  citation: (bib.agent_skills_spec, bib.claude_code_plugins),
  source: bib.claude_code_plugins,
  definition: terms => [
Spustitelné soubory nebo posloupnosti příkazů používané k deterministickému provedení opakovatelné operace. #cite(bib.claude_code_plugins)
  ],
  description: terms => [
Agentní rozšíření mohou skripty používat pro transformace, validace nebo jiné kroky, které je výhodnější provést programově než novým modelovým rozhodnutím. #cite(bib.agent_skills_spec) #cite(bib.claude_code_plugins)
  ],
  practical: terms => [
Skript je vhodný pro deterministické kroky, které mají být provedeny přesně a opakovatelně, například validaci nebo transformaci souborů.
  ],
  relations: ((type: "dependency", target: "harness"),),
)
