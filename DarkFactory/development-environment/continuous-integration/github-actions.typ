#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "github-actions",
    proper: translation(cs: "GitHub Actions", en: "GitHub Actions"),
    industry: translation(cs: "Actions", en: "Actions"),
    citation: bib.kinsman2021actions,
    source: bib.kinsman2021actions,
)

#let item = concept(
  key: "github_actions",
  term: terminology,
  definition: terms => [
GitHub Actions je automatizační platforma GitHubu pro spouštění deklarovaných workflow a jejich jobů v reakci na události repozitáře nebo ruční spuštění.
  ],
  description: terms => [
#unconfirmed[
GitHub Actions spouští deklarovaná workflow v reakci na události repozitáře. V této práci představuje konkrétní automatizační prostředí, které realizuje CI kontroly a další repozitářové procesy.
]
  ],
  summary: terms => [
V této práci GitHub Actions představuje konkrétní prováděcí prostředí CI a repozitářové automatizace, nikoli samotný princip průběžné integrace.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "github"),),
)