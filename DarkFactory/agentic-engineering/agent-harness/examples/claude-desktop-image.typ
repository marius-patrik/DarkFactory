#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "claude_desktop_image",
    czech: "Rozhraní aplikace Claude",
  english: "Claude Desktop Interface",
definition: terms => [Oficiální snímek aplikačního rozhraní Claude s pracovním artefaktem.],
  description: terms => [Konverzace s pracovním artefaktem a samostatným pracovním povrchem.],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/claude-desktop.png", width: 86%),
  caption: [Aplikační rozhraní Claude. Zdroj: Anthropic.],
)
  ],
  citations: (bib.anthropic_claude_desktop,),
)
