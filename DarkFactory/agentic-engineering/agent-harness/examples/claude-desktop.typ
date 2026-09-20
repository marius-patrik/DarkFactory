#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept
#import "claude-desktop-image.typ" as screenshot

#let terminology = define-term(
  id: "claude-desktop",
  proper: translation(cs: "Aplikace Claude pro desktop", en: "Claude Desktop App"),
  industry: translation(cs: "Claude Desktop", en: "Claude Desktop"),
  keyword: false,
)

#let item = concept(
  key: "claude_desktop",
  term: terminology,
  definition: terms => [Claude Desktop je desktopová aplikační vrstva nad modely Claude, která propojuje konverzaci s lokálními soubory, aplikacemi, webem a dalšími schopnostmi.],
  description: terms => [Anthropic popisuje desktopovou aplikaci jako prostředí, v němž může Claude se souhlasem uživatele přímo číst, upravovat a ukládat soubory a pracovat s dalšími aplikacemi. Jde proto o širší příklad harnessu než samotný chatbot.],
  summary: terms => [Desktopová aplikace ukazuje, jak harness rozšiřuje model o oprávnění, kontext a akce v uživatelském prostředí.],
  attachments: (screenshot.item,),
  citations: (bib.anthropic_claude_desktop,),
  relations: ((type: "related", target: "harness"),)
)
