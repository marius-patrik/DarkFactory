#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agent-harness/agent-harness.typ" as section
#import "/DarkFactory/agentic-engineering/agent-harness/turn.typ" as turn
#import "/DarkFactory/agentic-engineering/agent-harness/session-management.typ" as session
#import "/DarkFactory/agentic-engineering/agent-harness/transcript.typ" as transcript
#import "/DarkFactory/agentic-engineering/agent-harness/agent-loop.typ" as agent_loop
#import "/DarkFactory/agentic-engineering/agent-harness/divergence.typ" as divergence
#import "/DarkFactory/agentic-engineering/agent-harness/plugins.typ" as plugins
#import "/DarkFactory/agentic-engineering/agent-harness/subagent.typ" as subagent
#import "/DarkFactory/agentic-engineering/agent-harness/tools/index.typ" as tools
#import "/DarkFactory/agentic-engineering/agent-harness/skills/index.typ" as skills
#import "/DarkFactory/agentic-engineering/agent-harness/scripts/index.typ" as scripts
#import "/DarkFactory/agentic-engineering/agent-harness/hooks/index.typ" as hooks

#let node = folder(
  key: "harness",
  title: [Harness],
  section: section.item,
  concepts: (
    turn.item,
    session.item,
    transcript.item,
    agent_loop.item,
    divergence.item,
    plugins.item,
    subagent.item,
  ),
  children: (
    tools.node,
    skills.node,
    scripts.node,
    hooks.node,
  ),
)
