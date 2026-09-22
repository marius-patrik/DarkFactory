#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "tool_calling",
  term: "Vyvolávání nástrojů",
  keyword: "Tool Calling",
  citation: (bib.anthropic2024tooluse, bib.openai_structured_outputs),
  source: bib.anthropic2024tooluse,
  definition: terms => [
Mechanismus, kterým model místo běžné textové odpovědi vybere konkrétní #term(terms.tools) a vytvoří strukturované argumenty pro jeho vyvolání. #cite(bib.anthropic2024tooluse)
  ],
  description: terms => [
Schéma rozhraní omezuje tvar argumentů a umožňuje jejich programovou validaci; JSON Schema je jedním z používaných formátů takového kontraktu. #cite(bib.openai_structured_outputs)
  ],
  practical: terms => [
Tool Calling propojuje rozhodnutí modelu s deterministicky provedenou funkcí nebo službou a vrací skutečný výsledek zpět do dalšího kroku.
  ],
  relations: ((type: "dependency", target: "tools"), (type: "related", target: "agent_loop")),
)
