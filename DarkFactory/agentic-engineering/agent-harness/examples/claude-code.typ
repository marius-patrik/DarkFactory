#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#import "claude-code-image.typ" as screenshot


#let item = concept(
  key: "claude_code",
    industry: "Claude Code",
  czech: "Claude Code",
  english: "Claude Code",
definition: terms => [Claude Code je agentní vývojové prostředí společnosti Anthropic dostupné v terminálu, IDE, na webu a v desktopové aplikaci.],
  description: terms => [Systém může plánovat změny, číst a zapisovat soubory, spouštět příkazy a testy, používat Git a MCP a vytvářet pull requesty. Tyto schopnosti vznikají kombinací modelu s nástrojovou a stavovou vrstvou harnessu.],
  summary: terms => [Claude Code je konkrétní příklad agentního harnessu propojeného s reálným vývojovým prostředím.],
  attachments: (screenshot.item,),
  citations: (bib.anthropic_claude_code,),
  relations: ((type: "related", target: "harness"),)
)
