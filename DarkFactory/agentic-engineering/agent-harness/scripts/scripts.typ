#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "scripts",
  industry: "Scripts",
  czech: "Skripty",
  english: "Scripts",
  citation: (bib.agent_skills_spec, bib.claude_code_plugins),
  source: bib.claude_code_plugins,
  definition: terms => [
Spustitelné soubory nebo posloupnosti příkazů používané k deterministickému provedení opakovatelné operace.
  ],
  description: terms => [
Agentní rozšíření mohou skripty používat pro transformace, validace nebo jiné kroky, které je výhodnější provést programově než novým modelovým rozhodnutím. #cite(bib.agent_skills_spec) #cite(bib.claude_code_plugins)
  ],
  relations: ((type: "dependency", target: "tools"),),
)
