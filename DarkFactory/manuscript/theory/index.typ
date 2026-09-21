#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/theory/theory.typ" as section
#import "/DarkFactory/language-models/index.typ" as language_models
#import "/DarkFactory/agentic-engineering/agent-harness/index.typ" as agent_harness
#import "/DarkFactory/agentic-engineering/index.typ" as agentic_engineering

#let node = folder(
  key: "theory",
  section: section.item,
  children: (
    language_models.node,
    agent_harness.node,
    agentic_engineering.node,
  ),
)
