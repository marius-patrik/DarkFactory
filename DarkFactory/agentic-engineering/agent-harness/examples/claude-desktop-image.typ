#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "claude_desktop_image",
  term: "Rozhraní aplikace Claude",
  citation: bib.anthropic_claude_desktop,
  source: bib.anthropic_claude_desktop,
  definition: terms => [
Oficiální snímek aplikačního rozhraní Claude s pracovním artefaktem. #cite(bib.anthropic_claude_desktop)
  ],
  description: terms => [
Konverzace s pracovním artefaktem a samostatným pracovním povrchem.
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/claude-desktop.png", width: 86%),
  caption: [Aplikační rozhraní Claude. Zdroj: Anthropic #cite(bib.anthropic_claude_desktop).],
)
  ],
)
