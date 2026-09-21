#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/agentic-engineering/agentic-engineering.typ" as section
#import "/DarkFactory/agentic-engineering/vibe-coding.typ" as vibe_coding
#import "/DarkFactory/agentic-engineering/slop.typ" as slop
#import "/DarkFactory/agentic-engineering/guardrail.typ" as guardrail
#import "/DarkFactory/agentic-engineering/human-in-the-loop.typ" as human_in_the_loop
#import "/DarkFactory/agentic-engineering/sandbox.typ" as sandbox
#import "/DarkFactory/agentic-engineering/prompt-engineering/index.typ" as prompt_engineering
#import "/DarkFactory/agentic-engineering/loop-engineering/index.typ" as loop_engineering
#import "/DarkFactory/agentic-engineering/graph-engineering/index.typ" as graph_engineering

#let node = folder(
  key: "agentic_engineering",
  section: section.item,
  concepts: (
    guardrail.item,
    human_in_the_loop.item,
    sandbox.item,
    vibe_coding.item,
    slop.item,
  ),
  children: (
    prompt_engineering.node,
    loop_engineering.node,
    graph_engineering.node,
  ),
)
