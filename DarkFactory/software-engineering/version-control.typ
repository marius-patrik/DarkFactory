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
  practical: terms => [
Správa verzí umožňuje agentním změnám zůstat dohledatelné, porovnatelné a vratné místo přepisování pracovního stavu bez historie.
  ],
  relations: ((type: "related", target: "branch"),),
)
