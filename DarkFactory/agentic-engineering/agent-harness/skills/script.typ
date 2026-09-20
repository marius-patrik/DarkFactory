#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "script",
    proper: translation(cs: "Skript", en: "Script"),
    explanation_cs: "Soubor nebo posloupnost příkazů určených k automatizovanému vykonání interpretem, shellem nebo jiným běhovým prostředím.",
    explanation_en: "A file or sequence of commands intended for automated execution by an interpreter, shell, or another runtime.",
    citation: bib.anthropic2024tooluse,
    source: bib.anthropic2024tooluse,
)

#let item = concept(
  key: "script",
  term: terminology,
  definition: none,
  description: terms => [
#unconfirmed[
Skript poskytuje deterministickou exekuci pro úlohy, u nichž není vhodné znovu rozhodovat pomocí jazykového modelu, například pro opakovatelné transformace, validace nebo obslužné kroky dovednosti.
]
  ],
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)