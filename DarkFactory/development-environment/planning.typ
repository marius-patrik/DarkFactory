#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "planning",
  czech: "Plánování",
  english: "Planning",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
  definition: terms => [
Plánování je proces převodu požadavku na explicitní posloupnost kroků, závislostí a ověřovacích podmínek před prováděním změn.
  ],
  description: terms => [
V agentním vývoji plán před změnami určuje kontrolovatelné kroky a podmínky, podle nichž se ověří splnění zadání.
  ],
  relations: (),
)
