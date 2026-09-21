#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "sandbox",
  keyword: true,
  industry: "Sandbox",
  czech: "Izolované běhové prostředí",
  english: "Sandbox",
  citation: bib.agache2020firecracker,
  source: bib.agache2020firecracker,
  definition: terms => [
Omezené běhové prostředí, které odděluje prováděný kód a jeho oprávnění od hostitelského systému.
  ],
  description: terms => [
Izolační hranice mohou omezovat přístup k systémovým prostředkům; microVM představují jednu z možností silnější izolace nedůvěryhodných workloadů. #cite(bib.agache2020firecracker)
  ],
  relations: ((type: "dependency", target: "tools"),),
)
