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
Cambridge Dictionary uvádí pojem AI slop pro nekvalitní digitální obsah vytvořený AI. #cite(bib.cambridge2026aislop)

V kontextu softwaru lze stejný problém pozorovat jako rychle vytvořený výstup, který na první pohled splňuje zadání, ale obsahuje zbytečné vrstvy, duplicity, neověřené předpoklady nebo obtížně udržovatelný kód. Agentní workflow proto musí hodnotit výsledek podle testů, architektury a skutečného stavu repozitáře, ne podle množství vygenerovaného textu nebo kódu.
  ],
  relations: ((type: "related", target: "vibe_coding"),),
)
