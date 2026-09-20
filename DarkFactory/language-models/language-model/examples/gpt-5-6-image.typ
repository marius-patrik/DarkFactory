#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept
#let terminology = define-term(id: "gpt-5-6-image", proper: translation(cs: "Produktový vizuál GPT-5.6", en: "GPT-5.6 Product Visual"), keyword: false)
#let item = concept(
  key: "gpt_5_6_image", term: terminology,
  definition: terms => [Oficiální produktový vizuál modelové řady GPT-5.6.],
  description: terms => [Obrazový podklad je převzat z oficiálního vydání modelu OpenAI.],
  visual: terms => [#figure(image("/DarkFactory/img/external/gpt-5-6.png", width: 82%), caption: [GPT-5.6. Zdroj: OpenAI.])],
  summary: terms => [Vizuální identifikace příkladu jazykového modelu.],
  citations: (bib.openai_gpt56,),
)
