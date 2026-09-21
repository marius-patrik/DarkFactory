#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "github",
  czech: "GitHub",
  english: "GitHub",
  citation: (bib.github_branches, bib.github_pull_requests),
  source: bib.github_pull_requests,
  definition: terms => [
Platforma pro hostování gitových repozitářů a spolupráci nad změnami prostřednictvím větví a pull requestů. #cite(bib.github_branches) #cite(bib.github_pull_requests)
  ],
  description: terms => [
Pull request soustřeďuje navrženou změnu, diskusi, revizi, automatické kontroly a následné sloučení do cílové větve. #cite(bib.github_pull_requests)
  ],
  relations: ((type: "related", target: "version_control"), (type: "related", target: "github_actions")),
)
