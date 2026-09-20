#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "rag",
    proper: translation(cs: "Generování rozšířené vyhledáváním", en: "Retrieval-Augmented Generation"),
    industry: translation(cs: "RAG", en: "RAG"),
    explanation_cs: "Architektura, v níž systém před generováním nebo během něj vyhledá relevantní informace z externího zdroje a vloží je do kontextu modelu, aby výstup mohl být založen na načtených datech.",
    explanation_en: "An architecture in which a system retrieves relevant information from an external source before or during generation and places it into model context so the output can be grounded in the retrieved data.",
    citation: bib.lewis2020rag,
    source: bib.lewis2020rag,
)

#let item = concept(
  key: "rag",
  term: terminology,
  heading: terms => [Alternativní paměťové architektury (RAG a stavový graf)],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
Aby se předešlo ztrátě informací způsobené kompakcí, moderní agentní architektury přesouvají část paměti mimo samotné kontextové okno. Namísto spoléhání se na jediný lineární textový kontext se uplatňují strukturovaná externí úložiště.

K hlavním přístupům patří:
- #diff[Hierarchická epizodická paměť (RAG)][Hierarchická epizodická paměť (RAG @lewis2020rag)]: Ukládání doslovných protokolů nástrojů a historie úloh do externí databáze; do kontextu se selektivně injektují pouze bezprostředně relevantní fragmenty.
- Persistentní graf stavu projektu (_Project State Graph_): Udržování explicitního, strukturovaného přehledu o stavu repozitáře (seznam modifikovaných souborů, otevřené úkoly, výsledky testů a platné invarianty) mimo kontextové okno.

Díky tomu může agent kdykoliv obnovit přesný stav projektu bez závislosti na ztrátovém rekurzivním shrnování.
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: unconfirmed,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "embedding"),)
)