#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "model_inference_conclusion",
  title: [Závěr],
  definition: terms => [
Modelová vrstva převádí vstupní sekvenci na další výstup prostřednictvím inference omezené dostupným kontextem a běhovými prostředky.
  ],
  description: terms => [
Pro delší autonomní práci nestačí samotná inference: s rostoucím kontextem se zhoršuje spolehlivé využití relevantních informací a systém musí mimo model udržovat kontinuitu úlohy i skutečné účinky. Tuto hranici přebírá Harness.
  ],
)
