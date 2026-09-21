#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "dag",
  industry: "DAG",
  czech: "Orientovaný acyklický graf",
  english: "Directed Acyclic Graph",
  citation: bib.networkx_dag,
  source: bib.networkx_dag,
  definition: terms => [
Orientovaný graf bez orientovaných cyklů. #cite(bib.networkx_dag)
  ],
  description: terms => [
DAG lze použít jako dependency graph: uzly představují prvky nebo úlohy a orientované hrany jejich pořadí či závislosti; absence cyklu umožňuje konzistentní topologické uspořádání. #cite(bib.networkx_dag) Konkrétní Workflow Graph nemusí být DAG, pokud podporuje návraty nebo jiné cykly.
  ],
  relations: ((type: "related", target: "planning"), (type: "related", target: "workflow_graphs")),
)
