#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "review_fix_loop",
  term: "Smyčka revize a opravy",
  keyword: "Review/Fix Loop",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Opakovaný DarkFactory mechanismus, ve kterém je Planning nebo implementace nezávisle zkontrolována, zjištění jsou strukturovaně zachycena a následná oprava pokračuje do čistého výsledku.
  ],
  description: terms => [
Runtime ukládá předmět revize, fingerprint kontextu, nalezené problémy, stav čistoty, číslo iterace a historii review/fix kroků.
  ],
  relations: ((type: "dependency", target: "darkfactory_planning"), (type: "related", target: "goal_loops")),
)
