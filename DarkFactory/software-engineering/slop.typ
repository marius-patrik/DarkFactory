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
Neformální označení pro nekvalitní digitální obsah, zejména obsah vytvořený umělou inteligencí. #cite(bib.cambridge2026aislop)
  ],
  description: terms => [
V této práci označuje zejména AI-generovaný software, jehož objem nebo zdánlivá úplnost převyšují jeho ověřenou funkčnost a udržovatelnost.
  ],
  relations: ((type: "related", target: "vibe_coding"),),
)
