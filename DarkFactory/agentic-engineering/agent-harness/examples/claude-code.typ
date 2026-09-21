#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept
#import "claude-code-image.typ" as screenshot

#let item = concept(
  key: "claude_code",
  keyword: "Claude Code",
  citation: bib.anthropic_claude_code,
  source: bib.anthropic_claude_code,
  definition: terms => [
Agentní vývojové prostředí společnosti Anthropic dostupné v terminálu, IDE, na webu a v desktopové aplikaci. #cite(bib.anthropic_claude_code)
  ],
  description: terms => [
Claude Code může plánovat změny, upravovat soubory, spouštět příkazy a testy, používat Git a MCP a vytvářet pull requesty. #cite(bib.anthropic_claude_code)
  ],
  attachments: (screenshot.item,),
  relations: ((type: "related", target: "harness"),),
)
