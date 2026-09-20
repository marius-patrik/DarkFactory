#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "github",
    czech: "GitHub",
  english: "GitHub",
  citation: bib.dabbish2012github,
  source: bib.dabbish2012github,
definition: terms => [
GitHub je cloudová platforma pro hosting gitových repozitářů a koordinaci vývojového cyklu pomocí Issues, Pull Requests a automatizačních workflow.
  ],
  description: terms => [
#unconfirmed[
GitHub poskytuje nad gitovým repozitářem koordinační vrstvu pro zadání práce, revizi změn a automatizaci. Tyto odpovědnosti jsou v práci dále rozloženy mezi samostatné koncepty Issue, Pull Request a GitHub Actions.
]
  ],
  summary: terms => [
GitHub zde tvoří koordinační vrstvu nad Gitem, která propojuje zadání, revizi změn a automatizované kontroly.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "git"), (type: "related", target: "pull_request"), (type: "related", target: "github_actions"),),
)