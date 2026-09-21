#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/agent-harness.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/plugins.typ" as plugins
#import "/DarkFactory/agentic-engineering/agent-harness/subagent.typ" as subagent
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop/index.typ" as agent_loop
#import "/DarkFactory/agentic-engineering/agent-harness/tool-calling/index.typ" as tool_calling
#import "/DarkFactory/agentic-engineering/agent-harness/skills/index.typ" as skills
#import "/DarkFactory/agentic-engineering/agent-harness/context-engineering/index.typ" as context_engineering

#let node = folder(
  key: "harness",
  section: section.item,
  concepts: (
    plugins.item,
    subagent.item,
  ),
  children: (
    agent_loop.node,
    tool_calling.node,
    skills.node,
    context_engineering.node,
  ),
)
