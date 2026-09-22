#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "environment",
  term: "Prostředí agenta",
  keyword: "Agent Environment",
  citation: bib.anthropic_managed_agents,
  source: bib.anthropic_managed_agents,
  definition: terms => [
Vnější prostředí, které agent prostřednictvím harnessu pozoruje a mění, například pracovní soubory, procesy, síťové služby a další systémové prostředky. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
Změna souboru nebo spuštění procesu mění stav prostředí mimo modelový kontext. Přístup k těmto účinkům zprostředkovávají #term(terms.tools) a jejich bezpečnostní hranice. #cite(bib.anthropic_managed_agents)
  ],
  practical: terms => [
Prostředí dává agentovi konkrétní pracovní prostor, v němž může číst soubory, spouštět příkazy a pozorovat skutečné výsledky.
  ],
  relations: ((type: "dependency", target: "harness"),),
)
