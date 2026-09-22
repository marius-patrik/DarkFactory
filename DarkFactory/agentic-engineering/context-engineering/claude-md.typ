#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "claude_md",
  keyword: "CLAUDE.md",
  citation: bib.claude_code_memory,
  source: bib.claude_code_memory,
  definition: terms => [
CLAUDE.md je soubor trvalých instrukcí a kontextu, který Claude Code načítá do sezení. #cite(bib.claude_code_memory)
  ],
  description: terms => [
Projektové instrukce mohou být v `./CLAUDE.md` nebo `./.claude/CLAUDE.md`, uživatelské v `~/.claude/CLAUDE.md`; soubory nad pracovním adresářem se načítají při spuštění a soubory v podadresářích se mohou načíst až při práci v nich. Jde o kontextové instrukce, nikoli o vynucenou bezpečnostní hranici. #cite(bib.claude_code_memory)
  ],
  practical: terms => [
CLAUDE.md umožňuje udržovat trvalé projektové nebo uživatelské instrukce, které Claude Code načítá do kontextu sezení.
  ],
  relations: ((type: "related", target: "system_prompt"), (type: "related", target: "context_engineering"), (type: "related", target: "claude_directory")),
)
