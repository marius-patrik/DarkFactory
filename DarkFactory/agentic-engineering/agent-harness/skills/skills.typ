#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "skills",
  term: "Dovednosti",
  keyword: "Skills",
  citation: bib.agent_skills_spec,
  source: bib.agent_skills_spec,
  definition: terms => [
Znovupoužitelný balíček instrukcí a volitelných zdrojů, který se načítá pro úlohy odpovídající jeho účelu. #cite(bib.agent_skills_spec)
  ],
  description: terms => [
Agent Skill je definován souborem `SKILL.md` s YAML frontmatterem a instrukcemi v Markdownu; může odkazovat na doplňující skripty, reference nebo další zdroje načítané podle potřeby. #cite(bib.agent_skills_spec)
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "plugins")),
)
