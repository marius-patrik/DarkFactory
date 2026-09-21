#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/multi-agent-systems/subagent.typ" as subagent
#import "/DarkFactory/agentic-engineering/multi-agent-systems/orchestrator.typ" as orchestrator
#import "/DarkFactory/agentic-engineering/multi-agent-systems/handoff.typ" as handoff
#import "/DarkFactory/agentic-engineering/multi-agent-systems/swarm.typ" as swarm
#import "/DarkFactory/agentic-engineering/multi-agent-systems/workflow-graphs.typ" as workflow_graphs

#let node = folder(
  key: "multi_agent_systems",
  title: [Multi-Agent Systems],
  concepts: (
    subagent.item,
    orchestrator.item,
    handoff.item,
    swarm.item,
    workflow_graphs.item,
  ),
)
