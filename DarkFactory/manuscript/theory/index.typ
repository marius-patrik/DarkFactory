#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/theory/theory.typ" as section
#import "/DarkFactory/language-models/index.typ" as language_models
#import "/DarkFactory/agentic-ai/index.typ" as agentic_ai
#import "/DarkFactory/agentic-engineering/index.typ" as agentic_engineering
#import "/DarkFactory/development-environment/index.typ" as development_environment

#let node = folder(
  key: "theory",
  section: section.item,
  children: (
    language_models.node,
    agentic_ai.node,
    agentic_engineering.node,
    development_environment.node,
  ),
)
