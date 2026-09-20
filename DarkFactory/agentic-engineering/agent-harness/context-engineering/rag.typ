#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "rag",
    industry: "RAG",
  czech: "Generování rozšířené vyhledáváním",
  english: "Retrieval-Augmented Generation",
  citation: bib.lewis2020rag,
  source: bib.lewis2020rag,
definition: terms => [
Retrieval-Augmented Generation (RAG) je architektura, v níž systém před generováním nebo během něj vyhledá relevantní informace z externího zdroje a vloží je do kontextu modelu.
  ],
  description: terms => [
Aby se předešlo ztrátě informací způsobené kompakcí, moderní agentní architektury přesouvají část paměti mimo samotné kontextové okno. Namísto spoléhání se na jediný lineární textový kontext se uplatňují strukturovaná externí úložiště.

K hlavním přístupům patří:
- #diff[Hierarchická epizodická paměť (RAG)][Hierarchická epizodická paměť (RAG @lewis2020rag)]: Ukládání doslovných protokolů nástrojů a historie úloh do externí databáze; do kontextu se selektivně injektují pouze bezprostředně relevantní fragmenty.
- Persistentní graf stavu projektu (_Project State Graph_): Udržování explicitního, strukturovaného přehledu o stavu repozitáře (seznam modifikovaných souborů, otevřené úkoly, výsledky testů a platné invarianty) mimo kontextové okno.

Díky tomu může agent kdykoliv obnovit přesný stav projektu bez závislosti na ztrátovém rekurzivním shrnování.
  ],
  summary: terms => [
RAG odděluje dlouhodobé uchování informací od omezeného aktivního kontextu a umožňuje načítat pouze data relevantní pro aktuální krok.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "embedding"),),
)