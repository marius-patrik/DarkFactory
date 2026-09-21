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
Harness vymezuje, které části prostředí jsou dostupné a jakými rozhraními může agent provádět účinky mimo samotnou modelovou inferenci. #cite(bib.anthropic_managed_agents)
  ],
  relations: ((type: "dependency", target: "harness"),),
)
