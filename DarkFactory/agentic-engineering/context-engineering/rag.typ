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
Architektura, v níž systém vyhledá relevantní informace z externího zdroje a vloží je do kontextu modelu.
  ],
  description: terms => [
RAG umožňuje načítat potřebné informace podle aktuální úlohy místo jejich trvalého držení v aktivním kontextu. #cite(bib.lewis2020rag)
  ],
  relations: ((type: "dependency", target: "embedding"),),
)
