#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "model_inference_conclusion",
  title: [Závěr],
  definition: terms => [
Modelová vrstva poskytuje inferenční výstup, nikoli kontinuitu dlouhotrvající úlohy ani provedení účinků v externím prostředí.
  ],
  description: terms => [
Přechod od izolovaného modelového volání k systému schopnému dlouhodobě jednat proto vyžaduje další vrstvu. Tuto hranici přebírá Harness.
  ],
)
