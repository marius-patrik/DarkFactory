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
Formální popis parametrů nástroje pomocí JSON Schema s ověřením, že vygenerované argumenty před provedením odpovídají očekávané struktuře.
  ],
  description: terms => [
Schéma určuje povinná pole, datové typy a další omezení vstupu; rozhraní modelu může zároveň omezit generování argumentů tak, aby schématu odpovídaly. #cite(bib.json_schema_2020) #cite(bib.openai_structured_outputs)
  ],
  relations: ((type: "dependency", target: "tool_calling"),),
)
