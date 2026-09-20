#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/graph-engineering/graph-engineering.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/graph-engineering/subagent.typ" as subagent

#let node = folder(
  key: "graph_engineering",
  section: section.item,
  concepts: (subagent.item,),
)
