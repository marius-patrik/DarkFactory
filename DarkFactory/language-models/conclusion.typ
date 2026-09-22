#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "model_inference_conclusion",
  title: [Závěr],
  definition: terms => [
Modelová vrstva převádí vstupní sekvenci na další výstup prostřednictvím inference omezené kontextem a dostupnými výpočetními prostředky.
  ],
  description: terms => [
Pro delší autonomní práci proto nestačí samotná inference: systém musí mimo model udržovat kontinuitu úlohy a bezpečně zprostředkovat skutečné účinky. Tuto hranici přebírá Harness.
  ],
)
