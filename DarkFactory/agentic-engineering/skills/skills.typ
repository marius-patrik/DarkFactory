#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept
#import "skill-md-format.typ" as skill_md_format

#let item = concept(
  key: "skills",
  industry: "Skills",
  czech: "Dovednosti",
  english: "Skills",
  citation: bib.agent_skills_spec,
  source: bib.agent_skills_spec,
  definition: terms => [
Skill je znovupoužitelný balíček instrukcí a volitelných zdrojů načítaný pro úlohy, ke kterým je relevantní.
  ],
  description: terms => [
Formát Agent Skills používá soubor SKILL.md s metadaty a instrukcemi a může doplnit skripty, reference nebo další zdroje. #cite(bib.agent_skills_spec)
  ],
  examples: (skill_md_format.item,),
  relations: ((type: "dependency", target: "tool_calling"),),
)
