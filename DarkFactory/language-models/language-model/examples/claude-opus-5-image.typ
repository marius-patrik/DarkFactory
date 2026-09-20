#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#let item = concept(
  key: "claude_opus_5_image",   czech: "Produktový vizuál Claude Opus 5",
  english: "Claude Opus 5 Product Visual",
definition: terms => [Oficiální produktový vizuál modelu Claude Opus 5.],
  description: terms => [Obrazový podklad je převzat z oficiálního oznámení společnosti Anthropic.],
  visual: terms => [#figure(image("/DarkFactory/img/external/claude-opus-5.png", width: 82%), caption: [Claude Opus 5. Zdroj: Anthropic.])],
  summary: terms => [Vizuální identifikace příkladu jazykového modelu.], citations: (bib.anthropic_opus5,),
)
