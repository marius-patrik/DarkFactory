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
Popis parametrů nástroje pomocí JSON Schema, podle kterého lze validovat strukturu vygenerovaných argumentů. #cite(bib.json_schema_2020)
  ],
  description: terms => [
Schéma určuje například povinná pole, datové typy a další omezení; structured-output mechanismy mohou generování argumentů omezit tak, aby zadanému schématu odpovídaly. #cite(bib.openai_structured_outputs)
  ],
  relations: ((type: "dependency", target: "tools"),),
)
