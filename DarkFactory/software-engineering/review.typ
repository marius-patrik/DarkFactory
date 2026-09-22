#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "review",
  term: "Revize",
  keyword: "Review",
  citation: bib.github_pull_request_reviews,
  source: bib.github_pull_request_reviews,
  definition: terms => [
Revize je samostatná kontrola změny nebo výstupu proti explicitním požadavkům a kvalitativním kritériím před jeho přijetím.
  ],
  description: terms => [
GitHub Pull Request review například umožňuje změny komentovat, schválit nebo vrátit s požadavkem na úpravy před sloučením. #cite(bib.github_pull_request_reviews)
  ],
  practical: terms => [
Revize poskytuje samostatný kontrolní krok proti požadavkům a kvalitativním kritériím, takže nalezené odchylky lze vrátit k opravě před přijetím změny.
  ],
  relations: ((type: "related", target: "planning"), (type: "related", target: "pull_request"), (type: "related", target: "integration_test")),
)
