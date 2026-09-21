#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "divergence",
  term: "Divergence modelu",
  citation: (bib.liu2024, bib.jiang2023llmlingua),
  source: bib.liu2024,
  definition: terms => [
V této práci označuje postupné odchýlení pracovní reprezentace nebo generované trajektorie modelu od zamýšleného cíle či skutečného stavu.
  ],
  description: terms => [
Divergenci mohou podporovat dlouhý nebo zahlcený kontext, ztrátová kompakce a převzetí nepřesné mezireprezentace jako dalšího vstupu. Tento pojem zde zahrnuje i jev dříve označovaný jako sémantický posun. #cite(bib.liu2024) #cite(bib.jiang2023llmlingua)
  ],
  relations: ((type: "related", target: "context_rot"), (type: "related", target: "compaction")),
)
