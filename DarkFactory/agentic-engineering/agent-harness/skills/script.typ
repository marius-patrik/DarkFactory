#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "script",
    czech: "Skript",
  english: "Script",
  citation: bib.anthropic2024tooluse,
  source: bib.anthropic2024tooluse,
definition: terms => [
Skript je soubor nebo posloupnost příkazů určených k automatizovanému vykonání interpretem, shellem nebo jiným běhovým prostředím.
  ],
  description: terms => [
#finalized[
Skript poskytuje deterministickou exekuci pro úlohy, u nichž není vhodné znovu rozhodovat pomocí jazykového modelu, například pro opakovatelné transformace, validace nebo obslužné kroky dovednosti.
]
  ],
  summary: terms => [
Skripty přesouvají opakovatelné deterministické kroky mimo pravděpodobnostní rozhodování modelu.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)