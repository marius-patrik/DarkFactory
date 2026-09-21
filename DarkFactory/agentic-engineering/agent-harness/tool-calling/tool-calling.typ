#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept
#import "json-schema-tool-calling.typ" as json_schema_tool_calling
#import "code-execution.typ" as code_execution

#let item = concept(
  key: "tool_calling",
  industry: "Tool Calling",
  czech: "Vyvolávání nástrojů",
  english: "Tool Calling",
  citation: bib.schick2023toolformer,
  source: bib.anthropic2024tooluse,
  definition: terms => [
Vyvolávání nástrojů je mechanismus, kterým model požádá okolní systém o provedení konkrétní externí akce a předá jí potřebné parametry.
  ],
  description: terms => [
Nástroj zpřístupňuje modelu operaci, kterou samotná textová inference neprovádí, například čtení souboru, dotaz na API nebo změnu stavu systému. Harness přijme požadavek modelu, zkontroluje jej, provede příslušnou operaci a vrátí výsledek zpět do dalšího kroku agentního běhu.
  ],
  examples: (json_schema_tool_calling.item, code_execution.item),
  relations: ((type: "dependency", target: "agent_loop"),),
)
