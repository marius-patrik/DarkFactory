#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "tool_calling",
  term: "Vyvolávání nástrojů",
  keyword: "Tool Calling",
  citation: (bib.anthropic2024tooluse, bib.openai_structured_outputs),
  source: bib.anthropic2024tooluse,
  definition: terms => [
Mechanismus, kterým model vybere nástroj a předá jeho strukturované argumenty Harnessu místo přímého provedení operace.
  ],
  description: terms => [
Harness popisuje dostupné nástroje modelu a po výběru nástroje validuje argumenty, provede příslušnou operaci a výsledek vrátí do dalšího kroku agentní smyčky. JSON Schema je jedním z prostředků popisu rozhraní nástroje, nikoli samostatnou kategorií agentního mechanismu.
  ],
  relations: ((type: "dependency", target: "tools"), (type: "related", target: "agent_loop")),
)
