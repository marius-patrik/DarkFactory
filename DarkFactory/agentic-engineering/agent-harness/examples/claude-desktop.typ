#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#import "claude-desktop-image.typ" as screenshot


#let item = concept(
  key: "claude_desktop",
    industry: "Claude Desktop",
  czech: "Aplikace Claude pro desktop",
  english: "Claude Desktop App",
definition: terms => [Claude Desktop je desktopová aplikační vrstva nad modely Claude, která propojuje konverzaci s lokálními soubory, aplikacemi, webem a dalšími schopnostmi.],
  description: terms => [Anthropic popisuje desktopovou aplikaci jako prostředí, v němž může Claude se souhlasem uživatele přímo číst, upravovat a ukládat soubory a pracovat s dalšími aplikacemi. Jde proto o širší příklad harnessu než samotný chatbot.],
  attachments: (screenshot.item,),
  citations: (bib.anthropic_claude_desktop,),
  relations: ((type: "related", target: "harness"),)
)
