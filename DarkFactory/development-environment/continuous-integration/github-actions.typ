#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "github-actions",
    proper: translation(cs: "GitHub Actions", en: "GitHub Actions"),
    industry: translation(cs: "Actions", en: "Actions"),
    explanation_cs: "Automatizační platforma GitHubu, která spouští deklarované workflow a jejich joby v reakci na události repozitáře nebo ruční spuštění.",
    explanation_en: "GitHub's automation platform for running declared workflows and their jobs in response to repository events or manual dispatch.",
    citation: bib.kinsman2021actions,
    source: bib.kinsman2021actions,
)

#let item = concept(
  key: "github_actions",
  term: terminology,
  definition: none,
  description: terms => [
#unconfirmed[
GitHub Actions spouští deklarovaná workflow v reakci na události repozitáře. V této práci představuje konkrétní automatizační prostředí, které realizuje CI kontroly a další repozitářové procesy.
]
  ],
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "github"),),
)