#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept
#import "/DarkFactory/agentic-engineering/agent-harness/skills/skill-md-format.typ" as skill_md_format

#let item = concept(
  key: "skills",
  industry: "Skills",
  czech: "Dovednosti",
  english: "Skills",
  citation: bib.agent_skills_spec,
  source: bib.agent_skills_spec,
  definition: terms => [
Znovupoužitelný balíček instrukcí a volitelných zdrojů, který se načítá pro úlohy odpovídající jeho účelu. #cite(bib.agent_skills_spec)
  ],
  description: terms => [
Agent Skill je definován souborem `SKILL.md` a může odkazovat na doplňující skripty, reference nebo další zdroje načítané podle potřeby. #cite(bib.agent_skills_spec)
  ],
  examples: (skill_md_format.item,),
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "plugins")),
)
