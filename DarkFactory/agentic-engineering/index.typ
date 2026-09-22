#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/introduction.typ" as introduction
#import "/DarkFactory/agentic-engineering/conclusion.typ" as conclusion
#import "/DarkFactory/agentic-engineering/prompt-engineering/prompt-engineering.typ" as prompt_engineering
#import "/DarkFactory/agentic-engineering/prompt-engineering/system-prompt.typ" as system_prompt
#import "/DarkFactory/agentic-engineering/context-engineering/context-engineering.typ" as context_engineering
#import "/DarkFactory/agentic-engineering/context-engineering/context-injection.typ" as context_injection
#import "/DarkFactory/agentic-engineering/context-engineering/compaction.typ" as compaction
#import "/DarkFactory/agentic-engineering/context-engineering/rag.typ" as rag
#import "/DarkFactory/agentic-engineering/context-engineering/prompt-injection.typ" as prompt_injection
#import "/DarkFactory/agentic-engineering/goal-loops.typ" as goal_loops
#import "/DarkFactory/agentic-engineering/guardrail.typ" as guardrail
#import "/DarkFactory/agentic-engineering/human-in-the-loop.typ" as human_in_the_loop
#import "/DarkFactory/agentic-engineering/multi-agent-systems/subagent.typ" as subagent
#import "/DarkFactory/agentic-engineering/multi-agent-systems/orchestrator.typ" as orchestrator
#import "/DarkFactory/agentic-engineering/multi-agent-systems/handoff.typ" as handoff
#import "/DarkFactory/agentic-engineering/multi-agent-systems/workflow-graphs.typ" as workflow_graphs

#let intro = folder(key: "agentic_engineering", section: introduction.item)

#let context_ = folder(
  key: "agentic_context_instructions",
  title: [Instrukce a kontext],
  concepts: (
    prompt_engineering.item,
    system_prompt.item,
    context_engineering.item,
    context_injection.item,
    compaction.item,
    rag.item,
    prompt_injection.item,
  ),
)

#let behavior = folder(
  key: "agentic_behavior_control",
  title: [Řízení agentního chování],
  concepts: (
    goal_loops.item,
    guardrail.item,
    human_in_the_loop.item,
  ),
)

#let orchestration = folder(
  key: "agentic_orchestration",
  title: [Orchestrace agentů],
  concepts: (
    subagent.item,
    orchestrator.item,
    handoff.item,
    workflow_graphs.item,
  ),
)

#let close = folder(key: "agentic_engineering_conclusion", section: conclusion.item)

#let node = folder(
  key: "agentic_engineering",
  title: [Agentické inženýrství],
  children: (
    intro,
    context_,
    behavior,
    orchestration,
    close,
  ),
)
