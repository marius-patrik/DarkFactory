#import "/DarkFactory/templates/common.typ": finalized, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "github_actions",
  industry: "Actions",
  czech: "GitHub Actions",
  citation: bib.kinsman2021actions,
  source: bib.kinsman2021actions,
  definition: terms => [
GitHub Actions je automatizační platforma GitHubu pro spouštění deklarovaných workflow a jejich jobů v reakci na události repozitáře nebo ruční spuštění.
  ],
  description: terms => [#finalized[
V DarkFactory GitHub Actions spouští CI kontroly a další automatizované procesy repozitáře.
  ]],
  relations: ((type: "related", target: "github"),),
)
