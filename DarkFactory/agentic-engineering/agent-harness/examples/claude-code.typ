#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#import "claude-code-image.typ" as screenshot


#let item = concept(
  key: "claude_code",
    industry: "Claude Code",
  czech: "Claude Code",
  english: "Claude Code",
definition: terms => [Claude Code je agentní vývojové prostředí společnosti Anthropic dostupné v terminálu, IDE, na webu a v desktopové aplikaci.],
  description: terms => [Claude Code může plánovat změny, upravovat soubory, spouštět příkazy a testy, používat Git a MCP a vytvářet pull requesty.],
  attachments: (screenshot.item,),
  citations: (bib.anthropic_claude_code,),
  relations: ((type: "related", target: "harness"),)
)
