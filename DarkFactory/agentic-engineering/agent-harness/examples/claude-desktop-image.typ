#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "claude-desktop-image",
  proper: translation(cs: "Rozhraní aplikace Claude", en: "Claude Desktop Interface"),
  keyword: false,
)

#let item = concept(
  key: "claude_desktop_image",
  term: terminology,
  definition: terms => [Oficiální snímek aplikačního rozhraní Claude s pracovním artefaktem.],
  description: terms => [Snímek ukazuje, že aplikační vrstva může vedle konverzace zpřístupnit soubory, nástroje a samostatný pracovní povrch.],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/claude-desktop.webp", width: 86%),
  caption: [Aplikační rozhraní Claude. Zdroj: Anthropic.],
)
  ],
  summary: terms => [Vizuální příklad desktopového aplikačního harnessu.],
  citations: (bib.anthropic_claude_desktop,),
)
