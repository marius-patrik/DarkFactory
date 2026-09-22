#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "temperature",
  term: "Teplota",
  keyword: "Temperature",
  citation: bib.openai_responses_temperature,
  source: bib.openai_responses_temperature,
  definition: terms => [
Teplota je parametr vzorkování, který u rozhraní, jež jej podporují, ovlivňuje náhodnost výběru dalších tokenů. #cite(bib.openai_responses_temperature)
  ],
  description: terms => [
OpenAI Responses API dokumentuje rozsah 0 až 2; vyšší hodnoty zvyšují náhodnost a nižší hodnoty vedou k soustředěnějšímu a determinističtějšímu výstupu. #cite(bib.openai_responses_temperature)
  ],
  practical: terms => [
Teplota umožňuje řídit míru náhodnosti vzorkování tam, kde ji dané rozhraní podporuje; agentní systém ji proto může volit podle požadované stability nebo variability výstupu.
  ],
  relations: ((type: "dependency", target: "language_model"), (type: "related", target: "inference_engine")),
)
