#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "github",
    proper: translation(cs: "GitHub", en: "GitHub"),
    explanation_cs: "Cloudová platforma pro hosting gitových repozitářů, správu vývojového cyklu pomocí Issues a Pull Requests a automatizaci CI/CD pracovních postupů.",
    explanation_en: "A platform for hosting Git repositories and coordinating the software-development lifecycle through features such as Issues, Pull Requests, and CI/CD automation.",
    citation: bib.dabbish2012github,
    source: bib.dabbish2012github,
)

#let item = concept(
  key: "github",
  term: terminology,
  definition: none,
  description: terms => [
#unconfirmed[
GitHub poskytuje nad gitovým repozitářem koordinační vrstvu pro zadání práce, revizi změn a automatizaci. Tyto odpovědnosti jsou v práci dále rozloženy mezi samostatné koncepty Issue, Pull Request a GitHub Actions.
]
  ],
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "git"), (type: "related", target: "pull_request"), (type: "related", target: "github_actions"),),
)