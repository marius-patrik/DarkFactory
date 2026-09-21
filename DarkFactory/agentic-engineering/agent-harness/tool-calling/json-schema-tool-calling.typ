#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "json_schema_tool_calling",
  industry: "JSON Schema Tool Calling",
  czech: "Vyvolávání nástrojů s JSON Schema",
  english: "JSON Schema Tool Calling",
  citation: (bib.json_schema_2020, bib.openai_structured_outputs),
  source: bib.openai_structured_outputs,
  definition: terms => [
JSON Schema Tool Calling popisuje parametry nástroje formálním JSON Schema a před provedením ověřuje, že vygenerované argumenty odpovídají očekávané struktuře.
  ],
  description: terms => [
JSON Schema je standardní formát pro popis struktury a validaci JSON dat. Při vyvolávání nástrojů tak může harness přesně určit povinná pole, datové typy a další omezení vstupu. Moderní rozhraní modelů mohou navíc generování argumentů přímo omezit tak, aby odpovídalo dodanému schématu. #cite(bib.json_schema_2020) #cite(bib.openai_structured_outputs)
  ],
  relations: ((type: "dependency", target: "tool_calling"),),
)
