#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "rag",
  industry: "RAG",
  czech: "Generování rozšířené vyhledáváním",
  english: "Retrieval-Augmented Generation",
  citation: bib.lewis2020rag,
  source: bib.lewis2020rag,
  definition: terms => [
Architektura, ve které systém před generováním vyhledá relevantní informace z externího zdroje a poskytne je modelu jako další kontext. #cite(bib.lewis2020rag)
  ],
  description: terms => [
RAG odděluje znalost uloženou v externím korpusu od parametrů modelu a umožňuje vybírat podklady podle aktuálního dotazu. #cite(bib.lewis2020rag)
  ],
  relations: ((type: "dependency", target: "context_engineering"), (type: "related", target: "embedding")),
)
