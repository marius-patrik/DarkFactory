#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "branch_protection",
    czech: "Ochrana větví",
  english: "Branch Protection",
  citation: bib.chacon2014,
  source: bib.dabbish2012github,
definition: terms => [
Ochrana větví je sada pravidel repozitáře, která omezuje přímé změny chráněných větví a vynucuje schválení, kontroly nebo jiné podmínky před sloučením.
  ],
  description: terms => [
GitHub poskytuje pravidla ochrany větví #diff[(_Branch Protection Rules_)][(_Branch Protection Rules_ @chacon2014)], která zabraňují začlenění neověřeného kódu do stabilní větve `main`.

- Povinné schválení člověkem: Požadavek na explicitní autorizaci kódu lidským vývojářem dříve, než GitHub povolí sloučení do produkční větve.
  ],
  summary: terms => [
Ochrana větví převádí procesní pravidla integrace do technicky vynucované bariéry, kterou agent ani člověk nemůže obejít běžným přímým zápisem.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "required_checks"),),
)