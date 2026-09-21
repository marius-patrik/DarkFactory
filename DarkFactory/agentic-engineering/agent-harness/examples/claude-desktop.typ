#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept
#import "claude-desktop-image.typ" as screenshot

#let item = concept(
  key: "claude_desktop",
  industry: "Claude Desktop",
  czech: "Aplikace Claude pro desktop",
  english: "Claude Desktop App",
  citation: bib.anthropic_claude_desktop,
  source: bib.anthropic_claude_desktop,
  definition: terms => [
Desktopová aplikační vrstva nad modely Claude, která propojuje konverzaci s lokálními soubory, aplikacemi, webem a dalšími schopnostmi. #cite(bib.anthropic_claude_desktop)
  ],
  description: terms => [
Se souhlasem uživatele může aplikace číst, upravovat a ukládat soubory a pracovat s dalšími aplikacemi. #cite(bib.anthropic_claude_desktop)
  ],
  attachments: (screenshot.item,),
  relations: ((type: "related", target: "harness"),),
)
