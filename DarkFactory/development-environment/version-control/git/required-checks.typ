#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "required_checks",
    czech: "Požadované kontroly",
  english: "Required Checks",
  citation: bib.humble2010,
  source: bib.dabbish2012github,
definition: terms => [
Požadované kontroly jsou automatizované kontroly, jejichž úspěšné dokončení je povinnou podmínkou pro přijetí nebo sloučení změny.
  ],
  description: terms => [
#finalized[
V procesu DarkFactory nejsou automatické kontroly pouze informativní; vybrané kontroly jsou nastaveny jako podmínka integrace změny.

Mezi požadované kontroly mohou patřit statická analýza a linter, typová kontrola a sestavení projektu a automatizované testy. Každá kontrola musí vrátit jednoznačný výsledek, který lze použít jako strojově vyhodnotitelnou podmínku před sloučením pull requestu @humble2010.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "continuous_integration"),),
)