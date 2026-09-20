#import "../../../schema.typ": folder
#import "../../graph-engineering.typ" as section
#import "../../dag.typ" as dag

#let node = folder(
  key: "graph_engineering",
  section: section.item,
  concepts: (dag.item,),
)
