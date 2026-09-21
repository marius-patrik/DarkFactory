#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "slop",
  industry: "Slop",
  czech: "Slop",
  english: "Slop",
  citation: bib.cambridge2026aislop,
  source: bib.cambridge2026aislop,
  definition: terms => [
Slop je neformální označení pro velmi nekvalitní digitální obsah, zejména obsah vytvořený umělou inteligencí.
  ],
  description: terms => [
V softwaru se projevuje jako rychle vytvořený, ale zbytečně složitý, duplicitní nebo neověřený výstup; kvalitu proto musí určovat skutečné chování, testy a udržovatelnost. #cite(bib.cambridge2026aislop)
  ],
  relations: ((type: "related", target: "vibe_coding"),),
)
