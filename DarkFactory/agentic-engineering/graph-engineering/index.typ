#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/graph-engineering/graph-engineering.typ" as section
#import "/DarkFactory/agentic-engineering/graph-engineering/dag.typ" as dag

#let node = folder(
  key: "graph_engineering",
  section: section.item,
  concepts: (dag.item,),
)
