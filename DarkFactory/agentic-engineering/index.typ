#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agentic-engineering.typ" as section
#import "/DarkFactory/agentic-engineering/prompt-engineering/index.typ" as prompt_engineering
#import "/DarkFactory/agentic-engineering/agent-harness/index.typ" as agent_harness

#let node = folder(
  key: "agentic_engineering",
  section: section.item,
  children: (prompt_engineering.node, agent_harness.node),
)
