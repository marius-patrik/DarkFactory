#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agentic-engineering.typ" as section
#import "/DarkFactory/agentic-engineering/vibe-coding.typ" as vibe_coding
#import "/DarkFactory/agentic-engineering/slop.typ" as slop
#import "/DarkFactory/agentic-engineering/prompt-engineering/index.typ" as prompt_engineering
#import "/DarkFactory/agentic-engineering/agent-harness/index.typ" as agent_harness

#let node = folder(
  key: "agentic_engineering",
  section: section.item,
  concepts: (vibe_coding.item, slop.item),
  children: (prompt_engineering.node, agent_harness.node),
)
