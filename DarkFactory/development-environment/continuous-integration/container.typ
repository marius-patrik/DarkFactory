#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "container",
    industry: "Container",
  czech: "Softwarový kontejner",
  english: "Software Container",
  citation: bib.merkel2014docker,
  source: bib.merkel2014docker,
definition: terms => [
Softwarový kontejner je izolované uživatelské běhové prostředí, které balí aplikaci a její závislosti při sdílení jádra hostitelského operačního systému.
  ],
  description: terms => [
#finalized[
V CI poskytuje kontejner opakovatelné prostředí s deklarovanými nástroji a závislostmi, ale sám o sobě nezaručuje úplnou bezpečnostní izolaci.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)