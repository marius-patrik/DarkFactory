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
  heading: terms => [#term(terms.github_actions, marker: false, linked: false, emphasized: false)],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#unconfirmed[
GitHub Actions spouští deklarovaná workflow v reakci na události repozitáře. V této práci představuje konkrétní automatizační prostředí, které realizuje CI kontroly a další repozitářové procesy.
]
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "related", target: "github"),)
)