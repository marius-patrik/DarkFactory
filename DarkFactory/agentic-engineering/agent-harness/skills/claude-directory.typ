#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "claude_directory",
  keyword: ".claude/",
  citation: (bib.claude_code_memory, bib.claude_code_settings, bib.claude_code_hooks, bib.claude_code_skills),
  source: bib.claude_code_memory,
  definition: terms => [
`.claude/` je projektový nebo uživatelský jmenný prostor Claude Code pro instrukce, pravidla, nastavení a rozšíření. #cite(bib.claude_code_memory) #cite(bib.claude_code_settings)
  ],
  description: terms => [
Anthropic dokumentuje `.claude/CLAUDE.md`, modulární `.claude/rules/` a projektové `.claude/settings.json`; hooks a Skills jsou samostatné rozšiřující mechanismy s vlastními pravidly. #cite(bib.claude_code_memory) #cite(bib.claude_code_settings) #cite(bib.claude_code_hooks) #cite(bib.claude_code_skills)
  ],
  practical: terms => [
Adresář `.claude/` umožňuje verzovat projektová pravidla, nastavení a rozšíření Claude Code společně s repozitářem.
  ],
  relations: ((type: "related", target: "claude_md"), (type: "related", target: "skills"), (type: "related", target: "hooks")),
)
