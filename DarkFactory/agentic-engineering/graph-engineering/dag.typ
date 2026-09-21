#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "dag",
  industry: "DAG",
  czech: "Orientovaný acyklický graf",
  english: "Directed Acyclic Graph",
  citation: bib.wu2023autogen,
  source: bib.wu2023autogen,
  definition: terms => [
Orientovaný graf bez orientovaného cyklu používaný k vyjádření závislostí mezi kroky workflow.
  ],
  description: terms => [
V pracovním grafu představují uzly dílčí kroky a hrany jejich závislosti; acykličnost umožňuje určit pořadí provedení bez návratu do předchozího uzlu.
  ],
  relations: ((type: "dependency", target: "graph_engineering"),),
)
