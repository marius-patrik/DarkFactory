#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "orchestrator",
  industry: "Orchestrator",
  czech: "Orchestrátor",
  english: "Orchestrator",
  citation: (bib.openai_agent_orchestration, bib.anthropic2024tooluse),
  source: bib.openai_agent_orchestration,
  definition: terms => [
Koordinační role nebo komponenta, která rozhoduje, které specializované agenty spustit, jakou práci jim předat a jak jejich výsledky spojit. #cite(bib.openai_agent_orchestration)
  ],
  description: terms => [
Centralizovaný orchestrátor může zachovat kontrolu nad celým během a využívat další agenty jako omezené pracovní jednotky nebo nástroje. #cite(bib.openai_agent_orchestration) #cite(bib.anthropic2024tooluse)
  ],
  relations: ((type: "dependency", target: "subagent"),),
)
