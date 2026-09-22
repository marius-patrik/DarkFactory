#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "version_control",
  term: "Správa verzí",
  keyword: "Version Control",
  citation: bib.chacon2014,
  source: bib.chacon2014,
  definition: terms => [
Systém pro zaznamenávání a porovnávání historie změn souborů v čase. #cite(bib.chacon2014)
  ],
  description: terms => [
Uložená historie umožňuje identifikovat původ změny, vracet se k předchozím stavům a slučovat samostatně vzniklé změny. #cite(bib.chacon2014)
  ],
  relations: ((type: "related", target: "branch"),),
)
