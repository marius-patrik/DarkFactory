#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "sandbox",
  term: "Izolované prostředí",
  keyword: "Sandbox",
  citation: (bib.anthropic_managed_agents, bib.agache2020firecracker),
  source: bib.anthropic_managed_agents,
  definition: terms => [
Oddělené běhové prostředí, ve kterém agent může spouštět kód nebo měnit pracovní soubory bez přímého přístupu ke všem prostředkům hostitelského systému. #cite(bib.anthropic_managed_agents)
  ],
  description: terms => [
Sandbox vytváří bezpečnostní hranici kolem nedůvěryhodných účinků; konkrétní realizace může používat například kontejner nebo microVM. #cite(bib.anthropic_managed_agents) #cite(bib.agache2020firecracker)
  ],
  relations: ((type: "dependency", target: "environment"), (type: "related", target: "guardrail")),
)
