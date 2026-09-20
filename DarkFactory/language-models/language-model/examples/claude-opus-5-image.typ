#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept
#let terminology = define-term(id: "claude-opus-5-image", proper: translation(cs: "Produktový vizuál Claude Opus 5", en: "Claude Opus 5 Product Visual"), keyword: false)
#let item = concept(
  key: "claude_opus_5_image", term: terminology,
  definition: terms => [Oficiální produktový vizuál modelu Claude Opus 5.],
  description: terms => [Obrazový podklad je převzat z oficiálního oznámení společnosti Anthropic.],
  visual: terms => [#figure(image("/DarkFactory/img/external/claude-opus-5.png", width: 82%), caption: [Claude Opus 5. Zdroj: Anthropic.])],
  summary: terms => [Vizuální identifikace příkladu jazykového modelu.], citations: (bib.anthropic_opus5,),
)
