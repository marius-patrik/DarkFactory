#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "model_provider",
  term: "Poskytovatel modelu",
  keyword: "Model Provider",
  citation: bib.openai_model_providers,
  source: bib.openai_model_providers,
  definition: terms => [
Poskytovatel modelu je rozhraní nebo služba, přes kterou agentní runtime vybírá a volá konkrétní model. OpenAI Agents SDK například odděluje modelové implementace od providerů a podporuje OpenAI i jiné providery. #cite(bib.openai_model_providers)
  ],
  description: terms => [
Provider zprostředkovává přístup k modelu a jeho konkrétnímu API; dostupné funkce a nastavení se proto mohou mezi providery lišit. #cite(bib.openai_model_providers)
  ],
  practical: terms => [
Volba poskytovatele určuje dostupné modely, rozhraní, limity a provozní podmínky, se kterými musí Harness při volání modelu pracovat.
  ],
  relations: ((type: "related", target: "language_model"), (type: "related", target: "inference_engine")),
)
