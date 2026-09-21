#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "github_actions",
    industry: "Actions",
  czech: "GitHub Actions",
  english: "GitHub Actions",
  citation: bib.kinsman2021actions,
  source: bib.kinsman2021actions,
definition: terms => [
GitHub Actions je automatizační platforma GitHubu pro spouštění deklarovaných workflow a jejich jobů v reakci na události repozitáře nebo ruční spuštění.
  ],
  description: terms => [
#finalized[
V DarkFactory GitHub Actions spouští CI kontroly a další automatizované procesy repozitáře.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "github"),),
)