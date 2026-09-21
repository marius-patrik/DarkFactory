#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "version_control",
  term: "Správa verzí",
  keyword: "Version Control",
  citation: bib.chacon2014,
  source: bib.chacon2014,
  definition: terms => [
Systém pro zaznamenávání historie změn souborů a práci s oddělenými liniemi vývoje. #cite(bib.chacon2014)
  ],
  description: terms => [
Historie commitů umožňuje změny porovnávat, vracet a slučovat; větve umožňují oddělit souběžnou práci před integrací. #cite(bib.chacon2014)
  ],
  relations: ((type: "related", target: "branch"),),
)
