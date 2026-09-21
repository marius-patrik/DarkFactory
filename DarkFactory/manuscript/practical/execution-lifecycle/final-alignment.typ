#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "final_alignment",
  term: "Finální kontrola souladu",
  keyword: "Final Alignment",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Závěrečná kontrola, která před integrací ověřuje soulad implementace s aktuálním schváleným Planningem a případnými schválenými změnami rozsahu.
  ],
  description: terms => [
DarkFactory provádí Final Alignment až po deterministickém ověření a čisté implementační review/fix smyčce; teprve poté mohou následovat povinné kontroly, finální review a merge.
  ],
  relations: ((type: "dependency", target: "deterministic_verification"), (type: "related", target: "darkfactory_planning")),
)
