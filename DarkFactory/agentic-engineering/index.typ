#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agentic-engineering.typ" as agentic_engineering
#import "/DarkFactory/agentic-engineering/guardrail.typ" as guardrail
#import "/DarkFactory/agentic-engineering/human-in-the-loop.typ" as human_in_the_loop
#import "/DarkFactory/agentic-engineering/goal-loops.typ" as goal_loops
#import "/DarkFactory/agentic-engineering/prompt-engineering/index.typ" as prompting
#import "/DarkFactory/agentic-engineering/context-engineering/index.typ" as context
#import "/DarkFactory/agentic-engineering/multi-agent-systems/index.typ" as multi_agent_systems

#let goal_directed_execution = folder(
  key: "agentic_goal_directed_execution",
  title: [Cílené vykonávání],
  concepts: (
    goal_loops.item,
    guardrail.item,
    human_in_the_loop.item,
  ),
)

#let node = folder(
  key: "agentic_engineering",
  title: [Agentic Engineering],
  concepts: (agentic_engineering.item,),
  children: (
    prompting.node,
    context.node,
    goal_directed_execution,
    multi_agent_systems.node,
  ),
)
