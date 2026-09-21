#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "compaction",
  industry: "Compaction",
  czech: "Kompakce kontextu",
  english: "Context Compaction",
  citation: bib.jiang2023llmlingua,
  source: bib.jiang2023llmlingua,
  definition: terms => [
Zmenšení aktivního kontextu výběrem, shrnutím nebo nahrazením starší historie kompaktnější reprezentací.
  ],
  description: terms => [
Kompakce uvolňuje místo v kontextovém okně za cenu možné ztráty přesných detailů; důležité požadavky a stav proto nemají existovat pouze v rekurzivně shrnované historii. #cite(bib.jiang2023llmlingua)
  ],
  relations: ((type: "dependency", target: "context_window"),),
)
