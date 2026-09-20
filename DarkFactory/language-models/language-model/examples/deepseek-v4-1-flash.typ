#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#import "deepseek-v4-1-flash-image.typ" as visual
#let item = concept(
  key: "deepseek_v4_1_flash",   industry: "DeepSeek-V4.1-Flash",
  czech: "DeepSeek-V4.1-Flash",
  english: "DeepSeek-V4.1-Flash",
definition: terms => [DeepSeek-V4.1-Flash je multimodální model DeepSeek vydaný v září 2026.],
  description: terms => [Jde o příklad odlišné současné modelové architektury: DeepSeek jej popisuje jako 552B MoE s asymetrickým Causal Encoder–Decoder uspořádáním a nativním vizuálním vstupem.],
  summary: terms => [Příklad ukazuje, že pojem jazykového modelu v agentním systému zahrnuje různé konkrétní modelové rodiny a architektury.],
  attachments: (visual.item,), citations: (bib.deepseek_v41_flash,), relations: ((type: "related", target: "language_model"),)
)
