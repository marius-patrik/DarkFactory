#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#let item = concept(
  key: "deepseek_v4_1_flash_image",   czech: "Produktový vizuál DeepSeek-V4.1-Flash",
  english: "DeepSeek-V4.1-Flash Product Visual",
definition: terms => [Oficiální produktový vizuál modelu DeepSeek-V4.1-Flash.],
  description: terms => [Obrazový podklad je převzat z oficiálního vydání společnosti DeepSeek.],
  visual: terms => [#figure(image("/DarkFactory/img/external/deepseek-v4-1-flash.png", width: 82%), caption: [DeepSeek-V4.1-Flash. Zdroj: DeepSeek.])],
  summary: terms => [Vizuální identifikace příkladu jazykového modelu.], citations: (bib.deepseek_v41_flash,),
)
