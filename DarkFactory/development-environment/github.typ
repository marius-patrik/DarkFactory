#import "/DarkFactory/templates/common.typ": finalized, bib
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
  description: terms => [#finalized[
Nad historií spravovanou Gitem přidává GitHub zadání práce, revizi změn a automatizační workflow.
  ]],
  relations: ((type: "related", target: "version_control"), (type: "related", target: "github_actions")),
)
