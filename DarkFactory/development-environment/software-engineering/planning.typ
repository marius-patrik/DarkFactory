#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
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
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)