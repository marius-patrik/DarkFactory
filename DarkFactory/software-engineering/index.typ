#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/software-engineering/section.typ" as section
#import "/DarkFactory/software-engineering/vibe-coding.typ" as vibe_coding
#import "/DarkFactory/software-engineering/spec-driven-development.typ" as spec_driven_development
#import "/DarkFactory/software-engineering/planning.typ" as planning
#import "/DarkFactory/software-engineering/review.typ" as review
#import "/DarkFactory/software-engineering/version-control.typ" as version_control
#import "/DarkFactory/software-engineering/branch.typ" as branch
#import "/DarkFactory/software-engineering/pull-request.typ" as pull_request
#import "/DarkFactory/software-engineering/slop.typ" as slop
#import "/DarkFactory/software-engineering/continuous-integration.typ" as continuous_integration
#import "/DarkFactory/software-engineering/integration-test.typ" as integration_test
#import "/DarkFactory/agentic-engineering/prompt-engineering/prompt-engineering.typ" as prompt_engineering
#import "/DarkFactory/agentic-engineering/prompt-engineering/system-prompt.typ" as system_prompt
#import "/DarkFactory/agentic-engineering/context-engineering/agents-md.typ" as agents_md
#import "/DarkFactory/agentic-engineering/context-engineering/claude-md.typ" as claude_md
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
#import "/DarkFactory/agentic-engineering/multi-agent-systems/swarm.typ" as swarm

#let specification = folder(
  key: "ai_assisted_specification",
  title: [Zadání a způsob práce],
  concepts: (
    vibe_coding.item,
    spec_driven_development.item,
    planning.item,
    review.item,
  ),
)

#let change = folder(
  key: "ai_assisted_change_control",
  title: [Řízení změny],
  concepts: (
    version_control.item,
    branch.item,
    pull_request.item,
  ),
)

#let verification = folder(
  key: "ai_assisted_quality_verification",
  title: [Kvalita a ověřování],
  concepts: (
    slop.item,
    continuous_integration.item,
    integration_test.item,
  ),
)

#let context_ = folder(
  key: "agentic_context_instructions",
  title: [Instrukce a kontext],
  concepts: (
    prompt_engineering.item,
    system_prompt.item,
    agents_md.item,
    claude_md.item,
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
    swarm.item,
  ),
)

#let node = folder(
  key: "ai_assisted_agentic_engineering",
  section: section.item,
  children: (
    specification,
    change,
    verification,
    context_,
    behavior,
    orchestration,
  ),
)
