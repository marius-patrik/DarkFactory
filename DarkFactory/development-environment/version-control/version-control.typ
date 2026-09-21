#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "version_control",
  keyword: true,
  industry: "Version Control",
  czech: "Správa verzí",
  english: "Version Control",
  citation: bib.chacon2014,
  source: bib.chacon2014,
  definition: terms => [
Správa verzí je sledování historie změn v repozitáři tak, aby bylo možné změny porovnávat, oddělovat a bezpečně slučovat.
  ],
  description: terms => [
DarkFactory používá Git a GitHub k oddělení pracovního stavu agenta od hlavní historie projektu a k dohledání provedených změn. #cite(bib.chacon2014)
  ],
  relations: ((type: "related", target: "github"),),
)
