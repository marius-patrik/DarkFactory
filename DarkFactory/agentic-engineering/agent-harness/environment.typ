#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "environment",
  industry: "Environment",
  czech: "Běhové prostředí agenta",
  english: "Agent Environment",
  citation: bib.anthropic_managed_agents,
  source: bib.anthropic_managed_agents,
  definition: terms => [
Vnější prostředí, které agent prostřednictvím harnessu pozoruje a mění, například pracovní soubory, procesy, síťové služby a další systémové prostředky. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
Environment představuje skutečný stav světa mimo model: změna souboru nebo spuštění procesu mění prostředí, nikoli pouze textový kontext. Harness určuje, které části prostředí jsou dostupné a jakými rozhraními na ně může agent působit. #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "dependency", target: "harness"),),
)
