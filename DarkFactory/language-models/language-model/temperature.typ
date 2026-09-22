#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let openai_temperature_example = example(
  key: "temperature_openai_responses",
  title: [OpenAI Responses API],
  source: bib.openai_responses_temperature,
  description: terms => [
OpenAI u rozhraní Responses dokumentuje `temperature` v rozsahu 0 až 2 a jako příklady uvádí vyšší hodnotu 0,8 pro náhodnější výstup a nižší hodnotu 0,2 pro soustředěnější výstup. Jde o kontrakt tohoto konkrétního API, nikoli o univerzální rozsah všech modelů a providerů. #cite(bib.openai_responses_temperature)
  ],
)

#let item = concept(
  key: "temperature",
  term: "Teplota",
  keyword: "Temperature",
  citation: bib.openai_responses_temperature,
  source: bib.openai_responses_temperature,
  definition: terms => [
Teplota je parametr vzorkování, který u rozhraní, jež jej podporují, mění koncentraci pravděpodobnostního výběru dalších tokenů a tím ovlivňuje variabilitu generovaného výstupu. #cite(bib.openai_responses_temperature)
  ],
  description: terms => [
Nižší teplota typicky soustřeďuje výběr na pravděpodobnější pokračování, zatímco vyšší hodnota připouští větší variabilitu. Nelze ji ztotožnit s jednoduchým přepínačem determinismu: přesný rozsah, význam a interakce s dalšími sampling parametry jsou vlastností konkrétního modelového rozhraní. #cite(bib.openai_responses_temperature)
  ],
  examples: (openai_temperature_example,),
  practical: terms => [
Podporované sampling parametry lze volit podle charakteru úlohy: stabilnější strukturované kroky mohou vyžadovat koncentrovanější výběr, zatímco explorační generování může využít větší variabilitu. Nastavení musí respektovat možnosti konkrétního API.
  ],
  relations: ((type: "dependency", target: "language_model"), (type: "related", target: "inference_engine")),
)
