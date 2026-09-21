#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "context_engineering",
    czech: "Kontextové inženýrství",
  english: "Context Engineering",
  citation: bib.liu2024,
  source: bib.jiang2023llmlingua,
definition: terms => [
Kontextové inženýrství je systematický návrh, výběr, pořadí a životní cyklus informací zpřístupňovaných modelu v aktivním kontextu.
  ],
  description: terms => [
Kontext zahrnuje systémové instrukce, pracovní historii, výsledky nástrojů, externě načtená data a další informace, které model používá při rozhodování. Návrh této vrstvy určuje, které informace jsou modelu dostupné, kdy se načítají, jak dlouho zůstávají aktivní a jak se nahrazují při omezené kapacitě kontextového okna.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "context_window"),),
)
