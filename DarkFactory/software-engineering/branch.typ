#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "branch",
  term: "Větev",
  keyword: "Branch",
  citation: (bib.chacon2014, bib.github_branches),
  source: bib.github_branches,
  definition: terms => [
Oddělená linie vývoje v systému správy verzí, která ukazuje na vlastní posloupnost commitů. #cite(bib.chacon2014)
  ],
  description: terms => [
Větev umožňuje izolovat souběžnou změnu od cílové větve a později ji sloučit po kontrole nebo ověření. #cite(bib.chacon2014) #cite(bib.github_branches)
  ],
  practical: terms => [
Větev izoluje rozpracovanou agentní změnu od hlavní historie a vytváří bezpečný prostor pro testování a revizi před integrací.
  ],
  relations: ((type: "parent", target: "version_control"),),
)
