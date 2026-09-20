#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#let item = concept(
  key: "gpt_5_6_image",   czech: "Produktový vizuál GPT-5.6",
  english: "GPT-5.6 Product Visual",
definition: terms => [Oficiální produktový vizuál modelové řady GPT-5.6.],
  description: terms => [Obrazový podklad je převzat z oficiálního vydání modelu OpenAI.],
  visual: terms => [#figure(image("/DarkFactory/img/external/gpt-5-6.png", width: 82%), caption: [GPT-5.6. Zdroj: OpenAI.])],
  summary: terms => [Vizuální identifikace příkladu jazykového modelu.],
  citations: (bib.openai_gpt56,),
)
