#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "branch",
  industry: "Branch",
  czech: "Větev",
  english: "Branch",
  citation: (bib.chacon2014, bib.github_branches),
  source: bib.github_branches,
  definition: terms => [
Oddělená linie vývoje v systému správy verzí, která ukazuje na vlastní posloupnost commitů.
  ],
  description: terms => [
Větev umožňuje izolovat souběžnou změnu od cílové větve a později ji sloučit po kontrole nebo ověření. #cite(bib.chacon2014) #cite(bib.github_branches)
  ],
  relations: ((type: "dependency", target: "version_control"),),
)
