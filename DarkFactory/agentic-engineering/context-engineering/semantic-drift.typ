#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "semantic_drift",
  czech: "Sémantický posun",
  english: "Semantic Drift",
  citation: (bib.anthropic_context_engineering, bib.jiang2023llmlingua),
  source: bib.anthropic_context_engineering,
  definition: terms => [
V této práci označuje postupné zkreslení pracovního významu při opakovaném ztrátovém shrnování nebo transformaci kontextu.
  ],
  description: terms => [
Kompakce nutně vybírá, co zachovat a co vypustit; opakované komprese proto mohou odstranit jemné, ale později důležité informace a změnit pracovní reprezentaci původního stavu. #cite(bib.anthropic_context_engineering) #cite(bib.jiang2023llmlingua)
  ],
  relations: ((type: "related", target: "context_rot"), (type: "related", target: "compaction")),
)
