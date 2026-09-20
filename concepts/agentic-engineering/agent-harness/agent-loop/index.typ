#import "../../../schema.typ": folder
#import "agent-loop.typ" as section
#import "loop-engineering.typ" as loop_engineering
#import "divergence.typ" as divergence

#let node = folder(
  key: "agent_loop",
  section: section.item,
  concepts: (loop_engineering.item, divergence.item),
)
