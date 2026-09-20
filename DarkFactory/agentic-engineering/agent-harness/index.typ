#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/agent-harness.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/sandbox.typ" as sandbox
#import "/DarkFactory/agentic-engineering/agent-harness/human-in-the-loop.typ" as human_in_the_loop
#import "/DarkFactory/agentic-engineering/agent-harness/plugins.typ" as plugins
#import "/DarkFactory/agentic-engineering/agent-harness/guardrail.typ" as guardrail
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop/index.typ" as agent_loop
#import "/DarkFactory/agentic-engineering/agent-harness/tool-calling/index.typ" as tool_calling
#import "/DarkFactory/agentic-engineering/agent-harness/skills/index.typ" as skills
#import "/DarkFactory/agentic-engineering/agent-harness/context-engineering/index.typ" as context_engineering
#import "/DarkFactory/agentic-engineering/agent-harness/graph-engineering/index.typ" as graph_engineering

#let node = folder(
  key: "harness",
  section: section.item,
  concepts: (
    sandbox.item,
    guardrail.item,
    human_in_the_loop.item,
    plugins.item,
  ),
  children: (
    agent_loop.node,
    tool_calling.node,
    skills.node,
    context_engineering.node,
    graph_engineering.node,
  ),
)
