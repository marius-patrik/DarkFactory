#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let openai_provider_example = example(
  key: "model_provider_openai_agents",
  title: [OpenAI Agents SDK],
  source: bib.openai_model_providers,
  description: terms => [
Dokumentace OpenAI Agents SDK ukazuje konfiguraci modelu řetězcem, například `RunConfig(model="gpt-5.6-sol")`; výchozí OpenAI provider tento název překládá na konkrétní modelové rozhraní založené na Responses API. #cite(bib.openai_model_providers)
  ],
)

#let item = concept(
  key: "model_provider",
  term: "Poskytovatel modelu",
  keyword: "Model Provider",
  citation: bib.openai_model_providers,
  source: bib.openai_model_providers,
  definition: terms => [
Poskytovatel modelu je externí služba nebo programové rozhraní, přes které runtime vybírá a volá konkrétní model; provider může mapovat abstraktní jméno modelu na vlastní implementaci modelového API. #cite(bib.openai_model_providers)
  ],
  description: terms => [
Provider není samotný jazykový model ani lokální inferenční engine. Zprostředkovává přístup k modelům a určuje kontrakt požadavku, dostupné schopnosti a provozní omezení daného rozhraní; různí provideři proto mohou stejnou roli realizovat odlišnými API. #cite(bib.openai_model_providers)
  ],
  examples: (openai_provider_example,),
  practical: terms => [
Volba poskytovatele určuje, ke kterým modelům a schopnostem má agentní runtime přístup, jaké požadavky musí vytvářet a s jakými limity musí počítat. Oddělená provider vrstva umožňuje měnit způsob přístupu bez změny významu samotného modelu.
  ],
  relations: ((type: "related", target: "language_model"), (type: "related", target: "inference_engine")),
)
