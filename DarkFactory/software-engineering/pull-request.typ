#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "pull_request",
  industry: "Pull Request",
  czech: "Pull Request",
  english: "Pull Request",
  citation: bib.github_pull_requests,
  source: bib.github_pull_requests,
  definition: terms => [
Návrh na sloučení změn z jedné větve do jiné, kolem kterého GitHub soustřeďuje revizi, diskusi a automatické kontroly. #cite(bib.github_pull_requests)
  ],
  description: terms => [
Pull request zpřístupňuje diff navržené změny a její stav před integrací do cílové větve. #cite(bib.github_pull_requests)
  ],
  relations: ((type: "dependency", target: "branch"), (type: "related", target: "continuous_integration")),
)
