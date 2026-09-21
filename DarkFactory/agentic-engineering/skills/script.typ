#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "script",
    czech: "Skript",
  english: "Script",
  citation: bib.anthropic2024tooluse,
  source: bib.anthropic2024tooluse,
definition: terms => [
Soubor nebo posloupnost příkazů určených k automatizovanému vykonání interpretem, shellem nebo jiným běhovým prostředím.
  ],
  description: terms => [
#finalized[
V harnessu se skript používá pro opakovatelné transformace, validace a další kroky, které nemají vyžadovat nové rozhodnutí modelu.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)