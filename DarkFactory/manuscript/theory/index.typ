#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/theory/theory.typ" as section
#import "/DarkFactory/manuscript/theory/introduction/index.typ" as introduction
#import "/DarkFactory/software-engineering/index.typ" as software_engineering
#import "/DarkFactory/language-models/index.typ" as language_models
#import "/DarkFactory/agentic-engineering/agent-harness/index.typ" as harness
#import "/DarkFactory/agentic-engineering/index.typ" as agentic_engineering

#let node = folder(
  key: "theory",
  section: section.item,
  children: (
    introduction.node,
    software_engineering.node,
    language_models.node,
    harness.node,
    agentic_engineering.node,
  ),
)
