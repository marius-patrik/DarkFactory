#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "github_actions",
  industry: "GitHub Actions",
  czech: "GitHub Actions",
  citation: bib.github_actions_docs,
  source: bib.github_actions_docs,
  definition: terms => [
Automatizační platforma GitHubu, která spouští workflow složená z jobů a kroků v reakci na události, plán nebo ruční spuštění. #cite(bib.github_actions_docs)
  ],
  description: terms => [
Workflow jsou verzované YAML soubory v repozitáři a mohou automatizovat build, testování i nasazení. #cite(bib.github_actions_docs)
  ],
  relations: ((type: "related", target: "github"), (type: "related", target: "continuous_integration")),
)
