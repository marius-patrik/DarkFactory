#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop/agent-loop.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop/loop-engineering.typ" as loop_engineering
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop/session-management.typ" as session_management
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop/divergence.typ" as divergence

#let node = folder(
  key: "agent_loop",
  section: section.item,
  concepts: (session_management.item, loop_engineering.item, divergence.item),
)
