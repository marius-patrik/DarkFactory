#import "../../../schema.typ": folder
#import "agent-loop.typ" as section
#import "loop-engineering.typ" as loop_engineering
#import "session-management.typ" as session_management
#import "divergence.typ" as divergence

#let node = folder(
  key: "agent_loop",
  section: section.item,
  concepts: (session_management.item, loop_engineering.item, divergence.item),
)
