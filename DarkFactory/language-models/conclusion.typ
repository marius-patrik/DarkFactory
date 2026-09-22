#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "model_inference_conclusion",
  title: [Závěr],
  definition: terms => [
Model a inferenční engine společně vytvářejí výstup v mezích dostupného kontextu a běhových prostředků.
  ],
  description: terms => [
Nevlastní však trvalý agentní stav, účinky v externím prostředí ani dlouhodobou kontrolu úlohy. Tyto odpovědnosti začínají až ve vrstvě Harness.
  ],
)
