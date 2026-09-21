#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "tool_calling",
  keyword: true,
  industry: "Tool Calling",
  czech: "Vyvolávání nástrojů",
  english: "Tool Calling",
  citation: bib.schick2023toolformer,
  source: bib.anthropic2024tooluse,
  definition: terms => [
Mechanismus, kterým model požádá okolní systém o provedení konkrétní externí akce a předá jí potřebné parametry.
  ],
  description: terms => [
Nástroj zpřístupňuje modelu operaci, kterou samotná textová inference neprovádí, například čtení souboru, dotaz na API nebo změnu stavu systému. Harness přijme požadavek modelu, zkontroluje jej, provede příslušnou operaci a vrátí výsledek zpět do dalšího kroku agentního běhu.
  ],
  relations: ((type: "dependency", target: "agent_loop"),),
)
