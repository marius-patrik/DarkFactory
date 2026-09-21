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
Skill je znovupoužitelný balíček instrukcí a volitelných zdrojů, který agent načte tehdy, když je relevantní pro řešený úkol.
  ],
  description: terms => [
Otevřený formát Agent Skills používá adresář se souborem `SKILL.md`. Tento soubor obsahuje metadata a vlastní instrukce; adresář může navíc obsahovat skripty, reference nebo další zdroje. #cite(bib.agent_skills_spec)

Smyslem je přesunout specializované postupy mimo základní systémový prompt. Agent tak může mít k dispozici větší množství schopností, aniž by musel jejich úplné instrukce držet v kontextu po celou dobu práce.
  ],
  examples: (skill_md_format.item,),
  relations: ((type: "dependency", target: "tool_calling"),),
)
