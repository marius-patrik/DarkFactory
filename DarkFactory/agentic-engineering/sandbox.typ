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
Harness v sandboxu omezuje přístup k souborům, síti, tajnostem a dalším systémovým prostředkům. Silnější izolaci nedůvěryhodného kódu mohou poskytovat virtualizované hranice, například microVM. #cite(bib.agache2020firecracker)
  ],
  relations: ((type: "dependency", target: "tool_calling"),),
)
