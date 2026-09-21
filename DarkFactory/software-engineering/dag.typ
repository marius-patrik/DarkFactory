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
Orientovaný graf, který neobsahuje orientovaný cyklus a umožňuje vyjádřit závislosti mezi prvky v pořadí bez návratu k předchozímu uzlu.
  ],
  description: terms => [
Ve workflow lze uzly použít pro dílčí kroky a hrany pro jejich závislosti; nezávislé větve pak mohou být prováděny souběžně. Konkrétní Workflow Graph nemusí být DAG, pokud podporuje cykly nebo návraty. 
  ],
  relations: ((type: "related", target: "planning"), (type: "related", target: "workflow_graphs")),
)
