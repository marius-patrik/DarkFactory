#import "../../../schema.typ": folder
#import "graph-engineering.typ" as section
#import "dag.typ" as dag
#import "subagent.typ" as subagent

#let node = folder(
  key: "graph_engineering",
  section: section.item,
  concepts: (subagent.item, dag.item),
)
